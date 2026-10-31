import { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Mail, User, Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button, Field, inputClass } from '@/components/ui';
import { toast } from '@/components/Toast';
import { sanitize, sanitizeInput } from '@/lib/security';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'forgot';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TITLES: Record<Mode, string> = {
  login: 'Log In',
  signup: 'Create Account',
  forgot: 'Reset Password',
};

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setLoading(false);
  };

  const close = () => {
    reset();
    setMode('login');
    onClose();
  };

  const switchMode = (next: Mode) => {
    setPassword('');
    setShowPassword(false);
    setMode(next);
  };

  const cleanEmail = () => sanitize(email).trim().toLowerCase();

  const handleLogin = async () => {
    const emailValue = cleanEmail();
    if (!EMAIL_PATTERN.test(emailValue)) return toast('Enter a valid email address.', 'error');
    if (!password) return toast('Enter your password.', 'error');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailValue, password });
    setLoading(false);
    if (error) return toast('Incorrect email or password.', 'error');
    toast('Welcome back!');
    close();
  };

  const handleSignup = async () => {
    const nameValue = sanitize(name).trim();
    const emailValue = cleanEmail();
    if (nameValue.length < 2) return toast('Enter your full name.', 'error');
    if (!EMAIL_PATTERN.test(emailValue)) return toast('Enter a valid email address.', 'error');
    if (password.length < 6) return toast('Password must be at least 6 characters.', 'error');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password,
      options: { data: { name: nameValue } },
    });
    setLoading(false);
    if (error) return toast(error.message || 'Sign up failed.', 'error');
    if (!data.session) return toast('Account created. Check your email to finish signing in.', 'info');
    toast(`Welcome, ${nameValue}! Your account is ready.`);
    close();
  };

  const handleForgot = async () => {
    const emailValue = cleanEmail();
    if (!EMAIL_PATTERN.test(emailValue)) return toast('Enter a valid email address.', 'error');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) return toast('Could not send the reset email. Try again shortly.', 'error');
    toast('If an account exists for that email, a reset link is on its way.', 'info');
    switchMode('login');
  };

  const submit = () => {
    if (mode === 'login') void handleLogin();
    else if (mode === 'signup') void handleSignup();
    else void handleForgot();
  };

  const submitLabel = mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link';
  const submitIcon = mode === 'login' ? <LogIn className="h-4 w-4" /> : mode === 'signup' ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />;

  return (
    <Modal
      open={open}
      onClose={close}
      title={TITLES[mode]}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={mode === 'login' ? close : () => switchMode('login')}>
            {mode === 'login' ? 'Cancel' : 'Back'}
          </Button>
          <Button onClick={submit} loading={loading} icon={submitIcon}>{submitLabel}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {mode === 'signup' && (
          <Field label="Full name">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                value={name}
                maxLength={60}
                onChange={(e) => setName(sanitizeInput(e.target.value))}
                placeholder="Brian Gombe"
              />
            </div>
          </Field>
        )}

        {mode === 'forgot' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter the email on your account and we will send you a link to choose a new password.
          </p>
        )}

        <Field label="Email address">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              className={`${inputClass} pl-9`}
              value={email}
              maxLength={80}
              onChange={(e) => setEmail(sanitize(e.target.value))}
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
        </Field>

        {mode !== 'forgot' && (
          <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters.' : undefined}>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${inputClass} pl-9 pr-9`}
                value={password}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        )}

        {mode === 'login' && (
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => switchMode('forgot')} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Forgot password?
            </button>
            <p className="text-xs text-slate-400">
              No account yet?{' '}
              <button onClick={() => switchMode('signup')} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Sign up
              </button>
            </p>
          </div>
        )}

        {mode === 'signup' && (
          <p className="text-center text-xs text-slate-400">
            Already have an account?{' '}
            <button onClick={() => switchMode('login')} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Log in
            </button>
          </p>
        )}
      </div>
    </Modal>
  );
}
