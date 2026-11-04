'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, oauthUrl } from '@/lib/api';

type LoginValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeDasharray="32"
      strokeDashoffset="12"
    />
  </svg>
);

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('oauth_error');
    if (oauthError) {
      setAuthError(oauthError);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ defaultValues: { rememberMe: false } });

  const message = (err: unknown) =>
    err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    setAuthError('');
    try {
      const res = await api.post<{ mfaRequired: boolean; returnId?: string }>('/auth/login', data);
      if (res.mfaRequired) {
        setShowMfa(true);
      } else {
        router.push(
          res.returnId
            ? `/return-review-filing?id=${encodeURIComponent(res.returnId)}`
            : '/tax-interview'
        );
      }
    } catch (err) {
      setAuthError(message(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async () => {
    setLoading(true);
    setAuthError('');
    try {
      await api.post('/auth/mfa/verify', { code: mfaCode });
      router.push('/tax-interview');
    } catch (err) {
      setAuthError(message(err));
    } finally {
      setLoading(false);
    }
  };

  if (showMfa) {
    return (
      <div className="animate-fade-in">
        <div className="card-elevated p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Two-step verification</p>
              <p className="text-muted-foreground text-xs">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          </div>
          {authError && (
            <p role="alert" className="text-danger text-sm font-medium mb-3">
              {authError}
            </p>
          )}
          <label htmlFor="mfa-code" className="sr-only">
            6-digit code
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="form-input-base text-center text-2xl tracking-widest font-bold tabular-nums mb-4"
          />
          <button
            type="button"
            onClick={handleMfaSubmit}
            disabled={mfaCode.length < 6 || loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Verifying…
              </span>
            ) : (
              'Verify and continue'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {authError && (
        <div role="alert" className="alert-danger rounded-lg px-4 py-3 text-sm font-medium">
          {authError}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="login-email">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          className={`form-input-base ${errors.email ? 'form-input-error' : ''}`}
          {...register('email', {
            required: 'Enter your email address.',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' },
          })}
        />
        {errors.email && (
          <p role="alert" className="text-danger text-xs mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          className="block text-sm font-semibold text-foreground mb-1"
          htmlFor="login-password"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
            aria-invalid={!!errors.password}
            className={`form-input-base pr-16 ${errors.password ? 'form-input-error' : ''}`}
            {...register('password', { required: 'Enter your password.' })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:underline"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password && (
          <p role="alert" className="text-danger text-xs mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="-mt-2 text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="remember-me"
          type="checkbox"
          className="w-4 h-4 rounded accent-primary"
          {...register('rememberMe')}
        />
        <label htmlFor="remember-me" className="text-sm text-foreground">
          Keep me signed in on this device
        </label>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
        {loading ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Signing in…
          </span>
        ) : (
          'Sign in to True North'
        )}
      </button>

      <div className="relative flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-xs">or continue with</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.href = oauthUrl('google');
          }}
          className="btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = oauthUrl('apple');
          }}
          className="btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Apple
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground pt-2">
        Want a look first?{' '}
        <Link href="/return-review-filing" className="text-primary font-semibold hover:underline">
          View a sample return
        </Link>
      </p>
    </form>
  );
}
