'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [reset, setReset] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
    setReady(true);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password/reset', { token, password });
      setReset(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6 py-10">
      <section className="w-full max-w-md">
        <h1 className="text-foreground font-bold text-3xl mb-2">Choose a new password</h1>
        {reset ? (
          <div className="space-y-4">
            <p role="status" className="text-muted-foreground text-sm">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link href="/" className="btn-primary w-full">
              Back to sign in
            </Link>
          </div>
        ) : !ready ? (
          <p className="text-muted-foreground text-sm">Loading your secure reset link…</p>
        ) : !token ? (
          <div className="space-y-4">
            <p role="alert" className="text-danger text-sm">
              This password reset link is missing or invalid. Request a new one to continue.
            </p>
            <Link href="/forgot-password" className="btn-primary w-full">
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-sm mb-6">
              Use at least 12 characters, including a number and a special character.
            </p>
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <p role="alert" className="alert-danger rounded-lg px-4 py-3 text-sm">
                  {error}
                </p>
              )}
              <div>
                <label
                  className="block text-sm font-semibold text-foreground mb-1"
                  htmlFor="new-password"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  pattern="(?=.*[0-9])(?=.*[!@#$%^&*]).*"
                  title="Include a number and a special character such as ! or #."
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="form-input-base"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-semibold text-foreground mb-1"
                  htmlFor="confirm-new-password"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="form-input-base"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Updating password…' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
