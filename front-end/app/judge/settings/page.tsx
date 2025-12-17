'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, updatePassword, updateEmailPreferences, logout } from '@/lib/api';

export default function JudgeSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Email preferences state
  const [allowMarketingEmails, setAllowMarketingEmails] = useState(false);
  const [isUpdatingEmailPrefs, setIsUpdatingEmailPrefs] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const me = await getCurrentUser();
        if (!me.user) {
          router.push('/login');
          return;
        }

        // Check if user is a judge
        if (me.user.role !== 'judge') {
          router.replace('/');
          return;
        }

        setCurrentUser(me.user);
        
        // Load email preferences from user data if available
        if (me.user.allow_marketing !== undefined) {
          setAllowMarketingEmails(me.user.allow_marketing);
        }
      } catch (err: any) {
        console.error('Failed to load user data:', err);
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain a lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain a number');
    }
    return errors;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setPasswordErrors([]);

    // Validation
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    const validationErrors = validatePassword(passwordForm.newPassword);
    if (validationErrors.length > 0) {
      setPasswordErrors(validationErrors);
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const result = await updatePassword(passwordForm.oldPassword, passwordForm.newPassword);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage('Password updated successfully! You will be logged out shortly...');
        // Clear form
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        
        // Logout and redirect after 2 seconds
        setTimeout(async () => {
          await logout();
          router.replace('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEmailPreferencesChange = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsUpdatingEmailPrefs(true);

    try {
      const result = await updateEmailPreferences(allowMarketingEmails);
      
      if (result.error) {
        setError(result.error);
        // Revert toggle on error
        setAllowMarketingEmails(!allowMarketingEmails);
      } else {
        setSuccessMessage('Email preferences updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update email preferences');
      // Revert toggle on error
      setAllowMarketingEmails(!allowMarketingEmails);
    } finally {
      setIsUpdatingEmailPrefs(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
        <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
          <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">
            Judge Portal
          </div>
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5425FF]" />
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
        <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">
          Judge Portal
        </div>
        <nav className="flex flex-col gap-3 text-[#475569] font-figtree">
          <Link
            href="/judge/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100"
          >
            <span className="material-symbols-rounded text-lg">dashboard</span> Dashboard
          </Link>
          <Link href="/judge/assignments" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">groups</span> Assigned Teams
          </Link>
          <Link href="/judge/reviews" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">rate_review</span> My Reviews
          </Link>
          <Link href="/judge/notifications" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">notifications</span> Notifications
          </Link>
          <Link href="/judge/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">person</span> Profile
          </Link>
          <Link href="/judge/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold">
            <span className="material-symbols-rounded text-lg">settings</span> Settings
          </Link>
        </nav>
        <div className="mt-auto pt-6">
          <button
            onClick={async () => {
              try {
                await logout();
              } finally {
                router.replace('/login');
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-red-500 text-white font-figtree font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded">logout</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-8 space-y-6 overflow-y-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-silkscreen text-[#5425FF] flex items-center gap-2">
            <span className="material-symbols-rounded">settings</span>
            Settings
          </h1>
          <p className="text-[#64748b] font-figtree mt-1">
            Manage your account security and preferences
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">check_circle</span>
            {successMessage}
          </div>
        )}

        {/* Security Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded">lock</span>
            Security Settings
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.old ? 'text' : 'password'}
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF] pr-12"
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a]"
                >
                  <span className="material-symbols-rounded">
                    {showPasswords.old ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                    if (e.target.value) {
                      setPasswordErrors(validatePassword(e.target.value));
                    } else {
                      setPasswordErrors([]);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF] pr-12"
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a]"
                >
                  <span className="material-symbols-rounded">
                    {showPasswords.new ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {passwordErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordErrors.map((err, idx) => (
                    <p key={idx} className="text-sm text-red-600 font-figtree flex items-center gap-1">
                      <span className="material-symbols-rounded text-base">error</span>
                      {err}
                    </p>
                  ))}
                </div>
              )}
              {passwordForm.newPassword && passwordErrors.length === 0 && (
                <p className="mt-2 text-sm text-green-600 font-figtree flex items-center gap-1">
                  <span className="material-symbols-rounded text-base">check_circle</span>
                  Password meets all requirements
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF] pr-12"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a]"
                >
                  <span className="material-symbols-rounded">
                    {showPasswords.confirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="mt-2 text-sm text-red-600 font-figtree flex items-center gap-1">
                  <span className="material-symbols-rounded text-base">error</span>
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-figtree text-blue-800 font-semibold mb-2">Password Requirements:</p>
              <ul className="text-xs font-figtree text-blue-700 space-y-1 ml-4 list-disc">
                <li>Minimum 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-6 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdatingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Updating...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded">lock</span>
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>

        {/* Email Preferences */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded">email</span>
            Email Preferences
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex-1">
                <h3 className="font-figtree font-semibold text-[#0f172a] mb-1">
                  Marketing Emails
                </h3>
                <p className="text-sm font-figtree text-[#64748b]">
                  Receive updates about events, promotions, and announcements
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMarketingEmails}
                  onChange={(e) => {
                    setAllowMarketingEmails(e.target.checked);
                    handleEmailPreferencesChange();
                  }}
                  disabled={isUpdatingEmailPrefs}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#5425FF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#5425FF]"></div>
              </label>
            </div>

            {isUpdatingEmailPrefs && (
              <div className="flex items-center gap-2 text-sm text-[#64748b] font-figtree">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5425FF]" />
                <span>Updating preferences...</span>
              </div>
            )}
          </div>
        </div>

        {/* Account Information (Read-only) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded">account_circle</span>
            Account Information
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-figtree text-[#64748b]">Email</span>
              <span className="text-sm font-figtree font-semibold text-[#0f172a]">
                {currentUser?.email || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-figtree text-[#64748b]">Role</span>
              <span className="text-sm font-figtree font-semibold text-[#0f172a] capitalize">
                {currentUser?.role || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-figtree text-[#64748b]">Account Status</span>
              <span className={`text-sm font-figtree font-semibold flex items-center gap-1 ${
                currentUser?.is_verified ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <span className="material-symbols-rounded text-base">
                  {currentUser?.is_verified ? 'check_circle' : 'pending'}
                </span>
                {currentUser?.is_verified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

