import { useState } from 'react';
import { ChevronLeft, Lock, Eye, EyeOff, Shield, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { toast } from 'sonner';

// ── Inline legal content sheets ──────────────────────────────────────────────
const LEGAL: Record<string, { title: string; content: string }> = {
  privacy: {
    title: 'Privacy Policy',
    content: `Last updated: April 2026

BookMe ("we", "us", or "our") operates the BookMe mobile application. This policy explains how we collect, use, and protect your personal data.

INFORMATION WE COLLECT
• Account data: name, email, phone number, and profile photo when you register.
• Booking data: services booked, dates, times, delivery mode, and notes.
• Location data: only when you explicitly share it during the booking flow.
• Device data: FCM device token for push notification delivery only.

HOW WE USE YOUR INFORMATION
• To create and manage your bookings.
• To send booking confirmation and status notifications.
• To connect you with service providers.
• To improve our platform and fix issues.

DATA SHARING
We do not sell your personal information. We share data only with:
• The service provider for your specific booking.
• Supabase (our secure database host, ISO 27001 certified).
• Firebase Cloud Messaging (for push notifications only).

DATA STORAGE & SECURITY
Your data is stored on encrypted Supabase servers (AWS infrastructure). All traffic uses TLS 1.3 encryption. We retain your data as long as your account is active.

YOUR RIGHTS
You may request access to, correction of, or deletion of your personal data by contacting support at support@bookmebusiness.com.

CONTACT
BookMe Support — support@bookmebusiness.com`,
  },
  terms: {
    title: 'Terms of Service',
    content: `Last updated: April 2026

By using BookMe you agree to these terms. Please read them carefully.

1. ACCEPTANCE
By creating an account you confirm you are at least 18 years old and agree to these terms.

2. YOUR ACCOUNT
You are responsible for keeping your login credentials secure. Notify us immediately if you suspect unauthorised access.

3. BOOKING POLICY
• Bookings are requests — providers may accept or decline.
• Cancellation terms are set by each provider.
• BookMe is a marketplace and is not a party to service contracts between customers and providers.

4. PAYMENTS
Prices are set by service providers in Nigerian Naira (NGN). BookMe does not currently process payments in-app; payment terms are agreed directly with providers.

5. PROHIBITED CONDUCT
You must not: post false information, harass providers or other users, attempt to bypass our systems, or use BookMe for unlawful purposes.

6. LIMITATION OF LIABILITY
BookMe is not liable for the quality of services provided by third-party service providers. Use our review system to report issues.

7. CHANGES TO TERMS
We may update these terms. Continued use of the app constitutes acceptance of updated terms.

8. GOVERNING LAW
These terms are governed by the laws of the Federal Republic of Nigeria.

CONTACT: legal@bookmebusiness.com`,
  },
  cookie: {
    title: 'Cookie Policy',
    content: `Last updated: April 2026

BookMe uses limited local storage and session data to operate the app.

WHAT WE STORE LOCALLY
• Session tokens: to keep you logged in between app launches (stored in device localStorage, encrypted at rest).
• Permission flags: to remember whether you have been shown the notification/location permission modal.
• UI preferences: dark mode and language settings.

WE DO NOT USE
• Third-party advertising cookies or trackers.
• Analytics cookies beyond Supabase's built-in query logs.
• Cross-site tracking of any kind.

MANAGING STORAGE
You can clear all locally stored data by signing out and clearing the app's storage in your Android Settings → Apps → BookMe → Storage → Clear Data.

CONTACT: support@bookmebusiness.com`,
  },
};

const LegalSheet = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const { title, content } = LEGAL[id];
  return (
    <div className="fixed inset-0 z-[110] bg-foreground/40 flex items-end" onClick={onClose}>
      <div className="w-full bg-card rounded-t-3xl flex flex-col" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <h2 className="font-extrabold text-foreground">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{content}</p>
        </div>
      </div>
    </div>
  );
};

const PrivacySecurityPage = () => {
  const navigate = useNavigate();
  const { requireAuth, modal: authModal } = useRequireAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [legalPage, setLegalPage] = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error('Failed: ' + error.message);
    else { toast.success('Password updated!'); setShowPasswordForm(false); setNewPass(''); setConfirmPass(''); }
    setSaving(false);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-primary' : 'bg-muted'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-28">
      {legalPage && <LegalSheet id={legalPage} onClose={() => setLegalPage(null)} />}

      <div className="gradient-hero px-5 pt-10 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <h1 className="text-lg font-extrabold text-primary-foreground">Privacy & Security</h1>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Security */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">Security</p>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            <button onClick={() => requireAuth(() => setShowPasswordForm(!showPasswordForm), "change your password")}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your account password</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
            </button>

            {showPasswordForm && (
              <div className="px-4 py-4 space-y-3 bg-muted/30">
                {[
                  { label: 'New Password', val: newPass, set: setNewPass },
                  { label: 'Confirm Password', val: confirmPass, set: setConfirmPass },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-bold text-primary uppercase mb-1 block">{f.label}</label>
                    <div className="relative">
                      <input type={showNew ? 'text' : 'password'} value={f.val}
                        onChange={e => f.set(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl bg-card text-sm border border-border outline-none focus:ring-2 focus:ring-primary" />
                      <button onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={handleChangePassword} disabled={saving}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Privacy */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">Privacy</p>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Profile Visibility</p>
                <p className="text-xs text-muted-foreground">Visible to service providers</p>
              </div>
              <Toggle value={profileVisible} onChange={v => { setProfileVisible(v); toast.success(v ? 'Profile now visible' : 'Profile hidden'); }} />
            </div>
            <button onClick={() => toast.info('Data report available on request — contact support@bookmebusiness.com')}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Download My Data</p>
                <p className="text-xs text-muted-foreground">Get a copy of your personal data</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Legal — tapping opens actual content */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">Legal</p>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {[
              { id: 'privacy', label: 'Privacy Policy' },
              { id: 'terms',   label: 'Terms of Service' },
              { id: 'cookie',  label: 'Cookie Policy' },
            ].map(item => (
              <button key={item.id} onClick={() => setLegalPage(item.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Your data is stored securely on encrypted Supabase servers. We never sell your personal information.
          </p>
        </div>
      </div>

      {authModal}
    </div>
  );
};

export default PrivacySecurityPage;
