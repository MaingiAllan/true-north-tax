'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

type SignUpValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
};

interface SignUpFormProps {
  onSwitchToLogin: () => void;
}

export default function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpValues>();

  const password = watch('password');

  // Social Security numbers and dates of birth are collected later in the tax interview.
  const onSubmit = async (data: SignUpValues) => {
    setLoading(true);
    setFormError('');
    try {
      await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      router.push('/tax-interview');
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && (
        <div role="alert" className="alert-danger rounded-lg px-4 py-3 text-sm font-medium">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="first-name">
            First name
          </label>
          <input
            id="first-name"
            type="text"
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            className={`form-input-base ${errors.firstName ? 'form-input-error' : ''}`}
            {...register('firstName', { required: 'Enter your first name.' })}
          />
          {errors.firstName && (
            <p role="alert" className="text-danger text-xs mt-1">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="last-name">
            Last name
          </label>
          <input
            id="last-name"
            type="text"
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            className={`form-input-base ${errors.lastName ? 'form-input-error' : ''}`}
            {...register('lastName', { required: 'Enter your last name.' })}
          />
          {errors.lastName && (
            <p role="alert" className="text-danger text-xs mt-1">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="signup-email">
          Email address
        </label>
        <input
          id="signup-email"
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
          htmlFor="signup-password"
        >
          Password
        </label>
        <p className="text-muted-foreground text-xs mb-1">
          At least 12 characters, with a number and a special character.
        </p>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className={`form-input-base pr-16 ${errors.password ? 'form-input-error' : ''}`}
            {...register('password', {
              required: 'Create a password.',
              minLength: { value: 12, message: 'Use at least 12 characters.' },
              pattern: {
                value: /^(?=.*[0-9])(?=.*[!@#$%^&*])/,
                message: 'Include a number and a special character such as ! or #.',
              },
            })}
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

      <div>
        <label
          className="block text-sm font-semibold text-foreground mb-1"
          htmlFor="confirm-password"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          className={`form-input-base ${errors.confirmPassword ? 'form-input-error' : ''}`}
          {...register('confirmPassword', {
            required: 'Type your password again.',
            validate: (v) => v === password || 'The passwords do not match.',
          })}
        />
        {errors.confirmPassword && (
          <p role="alert" className="text-danger text-xs mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <input
          id="agree-terms"
          type="checkbox"
          className="w-4 h-4 mt-0.5 rounded accent-primary"
          {...register('agreeTerms', { required: 'Agree to the terms to create your account.' })}
        />
        <label htmlFor="agree-terms" className="text-xs text-muted-foreground leading-relaxed">
          I agree to the <span className="font-semibold text-foreground">Terms of Service</span> and{' '}
          <span className="font-semibold text-foreground">Privacy Policy</span>.
        </label>
      </div>
      {errors.agreeTerms && (
        <p role="alert" className="text-danger text-xs -mt-2">
          {errors.agreeTerms.message}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Creating your account…' : 'Create account and start filing'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
