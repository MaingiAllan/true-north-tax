'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@/lib/api';

interface Props {
  /** Positive means a refund. Negative means the taxpayer owes money. */
  balance: number;
  returnId?: string;
  filingDetailsSaved?: boolean;
}

type EFileValues = {
  pin: string;
  priorAgi: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  agreeDisclosure: boolean;
};

function validateRouting(val: string) {
  const d = val.replace(/\D/g, '');
  if (d.length !== 9) return 'A routing number has exactly 9 digits.';
  const n = d.split('').map(Number);
  const check = (3 * (n[0] + n[3] + n[6]) + 7 * (n[1] + n[4] + n[7]) + (n[2] + n[5] + n[8])) % 10;
  if (check !== 0)
    return 'This routing number does not look right. Check it against your bank statement.';
  return true;
}

const Tick = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--accent)"
    strokeWidth="3"
    aria-hidden="true"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function EFileSubmissionPanel({
  balance,
  returnId,
  filingDetailsSaved = false,
}: Props) {
  const [saved, setSaved] = useState(filingDetailsSaved);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => setSaved(filingDetailsSaved), [filingDetailsSaved]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EFileValues>({ defaultValues: { accountType: 'checking' } });

  const refund = balance > 0 ? balance : 0;
  const values = watch();

  const checklist = [
    { id: 'chk-agi', label: 'Last year’s income entered', done: saved || !!values.priorAgi },
    ...(refund > 0
      ? [
          {
            id: 'chk-bank',
            label: 'Direct deposit details entered',
            done:
              saved ||
              (validateRouting(values.routingNumber ?? '') === true &&
                (values.accountNumber ?? '').length >= 4),
          },
        ]
      : []),
    {
      id: 'chk-pin',
      label: 'Signature PIN created',
      done: saved || /^\d{5}$/.test(values.pin ?? ''),
    },
    { id: 'chk-decl', label: 'Declaration accepted', done: saved || !!values.agreeDisclosure },
  ];

  const onSubmit = async (values: EFileValues) => {
    if (!returnId || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.post(`/returns/${encodeURIComponent(returnId)}/filing`, values);
      reset({ accountType: 'checking' });
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : 'We could not save your filing details. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-elevated-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-base font-bold text-foreground">Filing details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Save signature and refund details to your return.
        </p>
      </div>

      {returnId && (
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground mb-3">Review before filing</p>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.done ? 'bg-green-100' : 'bg-muted border border-border'
                  }`}
                >
                  {item.done && <Tick />}
                </div>
                <span
                  className={`text-xs ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {item.label}
                  <span className="sr-only">{item.done ? ' (done)' : ' (not done)'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!returnId ? (
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            This sample return is for exploration only. Filing details are not collected or saved.
          </p>
        </div>
      ) : saved ? (
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-green-50 border border-green-200 p-5">
            <p className="text-base font-bold text-foreground mb-1">
              Your filing details are saved
            </p>
            <p className="text-sm text-muted-foreground">
              Your details are encrypted and saved to your return. Nothing has been sent to the IRS;
              e-filing is unavailable until True North is approved as an IRS e-file provider.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="btn-secondary w-full text-sm"
          >
            Update filing details
          </button>
          <p className="text-xs text-muted-foreground">
            For security, re-enter the details you want to update.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-4 space-y-6">
          {saveError && (
            <p role="alert" className="text-danger text-sm">
              {saveError}
            </p>
          )}
          {refund > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground mb-0.5">
                Direct deposit
              </legend>
              <p className="text-xs text-muted-foreground">
                Your ${refund.toLocaleString('en-US')} refund goes straight to your bank account.
              </p>
              <div>
                <label
                  className="block text-xs font-semibold text-foreground mb-1"
                  htmlFor="routing"
                >
                  Bank routing number
                </label>
                <input
                  id="routing"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={9}
                  placeholder="9 digits"
                  aria-invalid={!!errors.routingNumber}
                  className={`form-input-base font-mono text-sm ${errors.routingNumber ? 'form-input-error' : ''}`}
                  {...register('routingNumber', {
                    required: 'Enter your routing number.',
                    validate: validateRouting,
                  })}
                />
                {errors.routingNumber && (
                  <p role="alert" className="text-danger text-xs mt-1">
                    {errors.routingNumber.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-xs font-semibold text-foreground mb-1"
                  htmlFor="account"
                >
                  Account number
                </label>
                <input
                  id="account"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={!!errors.accountNumber}
                  className={`form-input-base font-mono text-sm ${errors.accountNumber ? 'form-input-error' : ''}`}
                  {...register('accountNumber', {
                    required: 'Enter your account number.',
                    minLength: { value: 4, message: 'This account number is too short.' },
                  })}
                />
                {errors.accountNumber && (
                  <p role="alert" className="text-danger text-xs mt-1">
                    {errors.accountNumber.message}
                  </p>
                )}
              </div>
              <div role="radiogroup" aria-label="Account type" className="flex gap-4">
                {(['checking', 'savings'] as const).map((type) => (
                  <label
                    key={`acct-type-${type}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      value={type}
                      className="accent-primary"
                      {...register('accountType')}
                    />
                    <span className="text-sm font-medium text-foreground capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {balance < 0 && (
            <p className="text-sm text-foreground">
              You owe ${Math.abs(balance).toLocaleString('en-US')}. Payment options will appear
              here.
            </p>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-0.5">
              Electronic signature
            </legend>
            <p className="text-xs text-muted-foreground">
              Choose a 5-digit PIN. It works as your signature on the return. Pick one you will
              remember.
            </p>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1" htmlFor="sig-pin">
                Signature PIN
              </label>
              <div className="relative">
                <input
                  id="sig-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={5}
                  placeholder="5 digits"
                  aria-invalid={!!errors.pin}
                  className={`form-input-base pr-16 font-mono tracking-widest text-center text-lg ${errors.pin ? 'form-input-error' : ''}`}
                  {...register('pin', {
                    required: 'Create a 5-digit PIN.',
                    pattern: { value: /^\d{5}$/, message: 'The PIN must be exactly 5 digits.' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((s) => !s)}
                  aria-pressed={showPin}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:underline"
                >
                  {showPin ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.pin && (
                <p role="alert" className="text-danger text-xs mt-1">
                  {errors.pin.message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-xs font-semibold text-foreground mb-1"
                htmlFor="prior-agi"
              >
                Your 2024 income before deductions
              </label>
              <p className="text-xs text-muted-foreground mb-1">
                This is line 11 of last year’s Form 1040. The IRS uses it to confirm it is really
                you.
              </p>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
                  aria-hidden="true"
                >
                  $
                </span>
                <input
                  id="prior-agi"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={!!errors.priorAgi}
                  className={`form-input-base pl-7 tabular-nums ${errors.priorAgi ? 'form-input-error' : ''}`}
                  {...register('priorAgi', {
                    required: 'Enter last year’s amount, or 0 if you did not file.',
                    pattern: { value: /^\d+$/, message: 'Use whole dollars, numbers only.' },
                  })}
                />
              </div>
              {errors.priorAgi && (
                <p role="alert" className="text-danger text-xs mt-1">
                  {errors.priorAgi.message}
                </p>
              )}
            </div>
          </fieldset>

          <div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted border border-border">
              <input
                id="agree-disclosure"
                type="checkbox"
                className="w-4 h-4 mt-0.5 accent-primary flex-shrink-0"
                {...register('agreeDisclosure', {
                  required: 'Accept the declaration to continue.',
                })}
              />
              <label
                htmlFor="agree-disclosure"
                className="text-xs text-muted-foreground leading-relaxed"
              >
                I understand that this demo saves these filing details only. This return is not
                transmitted to the IRS.
              </label>
            </div>
            {errors.agreeDisclosure && (
              <p role="alert" className="text-danger text-xs mt-1">
                {errors.agreeDisclosure.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-sm">
            {saving ? 'Saving filing details…' : 'Save filing details'}
          </button>
        </form>
      )}
    </div>
  );
}
