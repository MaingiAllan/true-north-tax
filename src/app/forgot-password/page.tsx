'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError, api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/password/forgot', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6 py-10">
      <section className="w-full max-w-md">
        <h1 className="text-foreground font-bold text-3xl mb-2">Reset your password</h1>
        {submitted ? (
          <div className="space-y-4">
            <p role="status" className="text-muted-foreground text-sm">
              If an account exists for that email, a password reset link is on its way. The link
              expires in 30 minutes.
            </p>
            <Link href="/" className="btn-primary w-full">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-sm mb-6">
              Enter the email address on your account and we’ll send you a reset link.
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
                  htmlFor="recovery-email"
                >
                  Email address
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="form-input-base"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending link…' : 'Send reset link'}
              </button>
              <p className="text-center text-sm">
                <Link href="/" className="font-semibold text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
