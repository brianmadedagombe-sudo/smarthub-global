import { useState } from 'react';
import { User as UserIcon, Mail, LogOut, ShieldCheck, Calendar } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button, Field, inputClass, OwnerBadge } from '@/components/ui';
import { toast } from '@/components/Toast';
import { sanitize, sanitizeInput } from '@/lib/security';
import { isOwnerEmail } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { AccountProfile } from '@/hooks/useSession';

interface AccountSettingsProps {
  open: boolean;
  onClose: () => void;
  email: string;
  profile: AccountProfile;
  createdAt: string | undefined;
}

export function AccountSettings({ open, onClose, email, profile, createdAt }: AccountSettingsProps) {
  const [editName, setEditName] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSaveProfile = async () => {
    const name = sanitize(editName).trim();
    if (name.length < 2) {
      toast('Enter a valid name.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      toast('Could not save your name. Try again.', 'error');
      return;
    }
    toast('Profile updated.');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);
    if (error) {
      toast('Could not log out. Try again.', 'error');
      return;
    }
    toast('You have been logged out.');
    onClose();
  };

  const roleLabel = profile.role === 'founder' ? 'Founder' : profile.role === 'merchant' ? 'Merchant' : 'Member';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Account Settings"
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={handleSaveProfile} loading={saving} icon={<ShieldCheck className="h-4 w-4" />}>Save Profile</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-lg font-bold text-white">
            {(profile.displayName || email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-semibold">{profile.displayName || email}</span>
              {isOwnerEmail(email) && <OwnerBadge />}
            </div>
            <div className="truncate text-xs text-slate-400">{email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Account role: <span className="font-semibold">{roleLabel}</span>
        </div>

        <Field label="Full name">
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              value={editName}
              maxLength={60}
              onChange={(e) => setEditName(sanitizeInput(e.target.value))}
            />
          </div>
        </Field>

        <Field label="Email (read only)">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} bg-slate-50 pl-9 dark:bg-slate-800/50`}
              value={email}
              readOnly
            />
          </div>
        </Field>

        {createdAt && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400 dark:bg-slate-800/50">
            <Calendar className="h-3.5 w-3.5" />
            Joined {new Date(createdAt).toLocaleDateString()}
          </div>
        )}

        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <Button variant="secondary" fullWidth onClick={handleLogout} loading={loggingOut} icon={<LogOut className="h-4 w-4" />}>
            Log Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}
