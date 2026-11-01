// Passkey authentication edge function — handles WebAuthn registration and login ceremonies.

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'npm:@simplewebauthn/server@10.0.1';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from 'npm:@simplewebauthn/server@10.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const RP_NAME = 'SmartHub Global';
const RP_ID = Deno.env.get('PASSKEY_RP_ID') ?? new URL(Deno.env.get('SUPABASE_URL') ?? 'http://localhost').hostname;
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: 'Server not configured.' });
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const rawBody = await req.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }

    const action = body.action;

    // ─── Generate registration challenge ───────────────────────────
    if (action === 'generate_registration') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(422, { error: 'Enter a valid email address.' });
      }

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: { email: string }) => u.email === email);

      // Fetch existing credentials for this user (if any) to exclude them
      let existingCreds: { credential_id: Uint8Array; transports: string[] }[] = [];
      if (existingUser) {
        const { data: creds } = await supabase
          .from('passkey_credentials')
          .select('credential_id, transports')
          .eq('user_id', existingUser.id);
        existingCreds = (creds ?? []).map((c: { credential_id: Uint8Array; transports: string[] }) => ({
          credential_id: c.credential_id as unknown as Uint8Array,
          transports: c.transports ?? [],
        }));
      }

      const challenge = randomHex(32);
      const challengeId = crypto.randomUUID();

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userName: email,
        userDisplayName: email,
        attestationType: 'none',
        excludeCredentials: existingCreds.map((c) => ({
          id: c.credential_id,
          type: 'public-key' as const,
          transports: c.transports as AuthenticatorTransport[],
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      // Override challenge with our own so we can store/verify it
      const challengeBytes = hexToBytes(challenge);
      (options as { challenge: Uint8Array }).challenge = challengeBytes;

      const { error: chError } = await supabase.from('passkey_challenges').insert({
        id: challengeId,
        challenge: challengeBytes as unknown as ArrayBuffer,
        user_id: existingUser?.id ?? null,
        purpose: 'registration',
      });
      if (chError) return json(500, { error: 'Could not start registration.' });

      return json(200, {
        challengeId,
        options: {
          ...options,
          challenge: bytesToBase64Url(challengeBytes),
        },
        email,
      });
    }

    // ─── Verify registration ────────────────────────────────────────
    if (action === 'verify_registration') {
      const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const attestationResponse = body.attestation as RegistrationResponseJSON | undefined;
      const deviceLabel = typeof body.deviceLabel === 'string' ? body.deviceLabel.trim() : null;

      if (!UUID_RE.test(challengeId) || !email || !attestationResponse) {
        return json(422, { error: 'Missing registration data.' });
      }

      // Fetch and validate challenge
      const { data: challengeRow, error: chError } = await supabase
        .from('passkey_challenges')
        .select('id, challenge, user_id, purpose, created_at, used')
        .eq('id', challengeId)
        .maybeSingle();
      if (chError || !challengeRow) return json(404, { error: 'Challenge not found. Try again.' });
      if (challengeRow.used) return json(409, { error: 'Challenge already used. Try again.' });
      if (challengeRow.purpose !== 'registration') return json(409, { error: 'Invalid challenge type.' });
      if (Date.now() - new Date(challengeRow.created_at).getTime() > CHALLENGE_EXPIRY_MS) {
        return json(410, { error: 'Challenge expired. Try again.' });
      }

      const expectedChallengeBytes = challengeRow.challenge as unknown as Uint8Array;
      const expectedChallenge = bytesToBase64Url(expectedChallengeBytes);

      // Mark challenge as used immediately
      await supabase.from('passkey_challenges').update({ used: true }).eq('id', challengeId);

      const verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: `https://${RP_ID}`,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return json(400, { error: 'Passkey registration failed. Please try again.' });
      }

      const info = verification.registrationInfo;
      const credentialId = new Uint8Array(info.credentialID);
      const publicKey = new Uint8Array(info.credentialPublicKey);

      // Find or create the Supabase auth user
      let userId = challengeRow.user_id as string | null;

      if (!userId) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: { email: string }) => u.email === email);

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            emailConfirm: true,
            userMetadata: { name: email, passkey_only: true },
          });
          if (createError || !newUser) {
            return json(500, { error: 'Could not create your account.' });
          }
          userId = newUser.id;
        }
      }

      // Store the credential
      const { error: credError } = await supabase.from('passkey_credentials').insert({
        user_id: userId,
        credential_id: credentialId as unknown as ArrayBuffer,
        public_key: publicKey as unknown as ArrayBuffer,
        sign_count: info.counter ?? 0,
        transports: info.credentialDeviceType === 'singleDevice' ? ['internal'] : ['internal', 'hybrid'],
        device_label: deviceLabel,
      });
      if (credError) {
        if (credError.code === '23505') {
          return json(409, { error: 'This passkey is already registered.' });
        }
        return json(500, { error: 'Could not save your passkey.' });
      }

      return json(200, { ok: true, userId });
    }

    // ─── Generate authentication challenge ──────────────────────────
    if (action === 'generate_authentication') {
      const challenge = randomHex(32);
      const challengeId = crypto.randomUUID();
      const challengeBytes = hexToBytes(challenge);

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: 'preferred',
      });

      (options as { challenge: Uint8Array }).challenge = challengeBytes;

      const { error: chError } = await supabase.from('passkey_challenges').insert({
        id: challengeId,
        challenge: challengeBytes as unknown as ArrayBuffer,
        user_id: null,
        purpose: 'authentication',
      });
      if (chError) return json(500, { error: 'Could not start authentication.' });

      return json(200, {
        challengeId,
        options: {
          ...options,
          challenge: bytesToBase64Url(challengeBytes),
        },
      });
    }

    // ─── Verify authentication ──────────────────────────────────────
    if (action === 'verify_authentication') {
      const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
      const assertionResponse = body.assertion as AuthenticationResponseJSON | undefined;

      if (!UUID_RE.test(challengeId) || !assertionResponse) {
        return json(422, { error: 'Missing authentication data.' });
      }

      // Fetch and validate challenge
      const { data: challengeRow, error: chError } = await supabase
        .from('passkey_challenges')
        .select('id, challenge, purpose, created_at, used')
        .eq('id', challengeId)
        .maybeSingle();
      if (chError || !challengeRow) return json(404, { error: 'Challenge not found. Try again.' });
      if (challengeRow.used) return json(409, { error: 'Challenge already used. Try again.' });
      if (challengeRow.purpose !== 'authentication') return json(409, { error: 'Invalid challenge type.' });
      if (Date.now() - new Date(challengeRow.created_at).getTime() > CHALLENGE_EXPIRY_MS) {
        return json(410, { error: 'Challenge expired. Try again.' });
      }

      const expectedChallengeBytes = challengeRow.challenge as unknown as Uint8Array;
      const expectedChallenge = bytesToBase64Url(expectedChallengeBytes);

      // Mark challenge as used
      await supabase.from('passkey_challenges').update({ used: true }).eq('id', challengeId);

      // Find the credential by its ID
      const credentialIdRaw = assertionResponse.id;
      const credentialIdBytes = base64UrlToBytes(credentialIdRaw);

      const { data: credRow, error: credError } = await supabase
        .from('passkey_credentials')
        .select('id, user_id, public_key, sign_count, transports')
        .eq('credential_id', credentialIdBytes as unknown as ArrayBuffer)
        .maybeSingle();
      if (credError || !credRow) {
        return json(404, { error: 'Passkey not recognized. Try again or register a new passkey.' });
      }

      const publicKey = new Uint8Array(credRow.public_key as unknown as ArrayBuffer);
      const storedSignCount = credRow.sign_count ?? 0;

      const verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge,
        expectedOrigin: `https://${RP_ID}`,
        expectedRPID: RP_ID,
        credential: {
          id: credentialIdBytes,
          publicKey,
          counter: storedSignCount,
          transports: (credRow.transports ?? []) as AuthenticatorTransport[],
        },
      });

      if (!verification.verified) {
        return json(400, { error: 'Passkey verification failed. Please try again.' });
      }

      // Update sign count
      const newSignCount = verification.authenticationInfo.newCounter;
      await supabase
        .from('passkey_credentials')
        .update({ sign_count: newSignCount })
        .eq('id', credRow.id);

      // Issue a Supabase access token for this user
      const userId = credRow.user_id as string;

      // Get user email and generate a session
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData.user) {
        return json(500, { error: 'Could not load your account.' });
      }

      // Generate a proper session by creating a magic link and extracting the token
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email ?? '',
      });
      if (linkError || !linkData) {
        return json(500, { error: 'Could not create your session.' });
      }

      // The properties contain the token we need
      const link = linkData.properties;
      const accessToken = (link as { access_token?: string }).access_token ?? '';
      const refreshToken = (link as { refresh_token?: string }).refresh_token ?? '';
      const expiresIn = (link as { expires_in?: number }).expires_in ?? 3600;

      if (!accessToken) {
        return json(500, { error: 'Could not create your session.' });
      }

      return json(200, {
        ok: true,
        user: {
          id: userId,
          email: userData.user.email,
          name: (userData.user.user_metadata as { name?: string })?.name ?? userData.user.email,
        },
        session: {
          accessToken,
          refreshToken,
          expiresIn,
        },
      });
    }

    return json(400, { error: 'Unknown action.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return json(500, { error: message });
  }
});
