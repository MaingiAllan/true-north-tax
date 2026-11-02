'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss';
type YesNo = 'yes' | 'no';
type Errors = Record<string, string>;

interface W2 {
  id: string;
  employer: string;
  wages: string;
  withheld: string;
}

interface Answers {
  filingStatus: FilingStatus | '';
  firstName: string;
  lastName: string;
  dob: string;
  ssn: string;
  spouseFirstName: string;
  spouseLastName: string;
  spouseDob: string;
  spouseSsn: string;
  spouseItemizes: YesNo | '';
  hasDependents: YesNo | '';
  dependentCount: string;
  hasW2: YesNo | '';
  w2s: W2[];
  interest: string;
  dividends: string;
  studentLoanInterest: string;
  hsa: string;
  ira: string;
}

interface Step {
  id: string;
  title: string;
  hint?: string;
  applies: (a: Answers) => boolean;
  validate: (a: Answers) => Errors;
  body: () => ReactNode;
}

const FILING_OPTIONS: { value: FilingStatus; label: string; help: string }[] = [
  {
    value: 'single',
    label: 'Single',
    help: 'You are unmarried, or legally separated, on December 31.',
  },
  {
    value: 'mfj',
    label: 'Married filing jointly',
    help: 'You and your spouse file one return together.',
  },
  {
    value: 'mfs',
    label: 'Married filing separately',
    help: 'You and your spouse each file your own return.',
  },
  {
    value: 'hoh',
    label: 'Head of household',
    help: 'You are unmarried and paid more than half the cost of keeping up a home for a qualifying person.',
  },
  {
    value: 'qss',
    label: 'Qualifying surviving spouse',
    help: 'Your spouse died in 2023 or 2024 and you have a dependent child.',
  },
];

const INITIAL: Answers = {
  filingStatus: '',
  firstName: '',
  lastName: '',
  dob: '',
  ssn: '',
  spouseFirstName: '',
  spouseLastName: '',
  spouseDob: '',
  spouseSsn: '',
  spouseItemizes: '',
  hasDependents: '',
  dependentCount: '',
  hasW2: '',
  w2s: [{ id: 'w2-1', employer: '', wages: '', withheld: '' }],
  interest: '',
  dividends: '',
  studentLoanInterest: '',
  hsa: '',
  ira: '',
};

// IRS forms use whole dollars, so commas, periods and letters are stripped as the person types.
const digitsOnly = (v: string, max = 9) => v.replace(/\D/g, '').slice(0, max);

const formatSsn = (v: string) => {
  const d = digitsOnly(v, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
};

const usd = (v: number) => `$${v.toLocaleString('en-US')}`;
const total = (values: string[]) => values.reduce((t, v) => t + Number(v || 0), 0);

function validateSsn(value: string): string | null {
  const d = value.replace(/\D/g, '');
  if (d.length !== 9) return 'Enter all 9 digits.';
  if (/^0+$/.test(d)) return 'A number made of all zeros is not valid.';
  if (/^9+$/.test(d)) return 'A number made of all nines is not valid.';
  if (
    d.startsWith('000') ||
    d.startsWith('666') ||
    Number(d.slice(0, 3)) >= 900 ||
    d.slice(3, 5) === '00' ||
    d.slice(5) === '0000'
  ) {
    return 'Enter a valid Social Security number.';
  }
  return null;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-1">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground mb-1.5">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger text-xs mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;

function MoneyInput({
  id,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
        aria-hidden="true"
      >
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, hint, error)}
        className={`form-input-base pl-7 tabular-nums ${error ? 'form-input-error' : ''}`}
      />
    </div>
  );
}

function Choice({
  name,
  value,
  checked,
  disabled,
  label,
  help,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  help?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
        checked ? 'border-primary bg-muted' : 'border-border bg-card'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1 accent-primary"
      />
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {help && <span className="block text-xs text-muted-foreground mt-0.5">{help}</span>}
        {disabled && (
          <span className="block text-xs text-muted-foreground mt-0.5">Not available yet.</span>
        )}
      </span>
    </label>
  );
}

export default function InterviewShell() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(INITIAL);
  const [stepId, setStepId] = useState('filing-status');
  const [errors, setErrors] = useState<Errors>({});
  const [showSsn, setShowSsn] = useState(false);
  const [showSpouseSsn, setShowSpouseSsn] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingReturnId, setExistingReturnId] = useState<string | null>(null);
  const [loadingSavedReturn, setLoadingSavedReturn] = useState(false);
  const [loadError, setLoadError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const returnId = new URLSearchParams(window.location.search).get('returnId');
    if (!returnId) return;

    let active = true;
    setExistingReturnId(returnId);
    setLoadingSavedReturn(true);
    api
      .get<{ answers: Answers }>(`/returns/${encodeURIComponent(returnId)}/interview`)
      .then(({ answers: savedAnswers }) => {
        if (active) setAnswers(savedAnswers);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'We could not load your saved interview. Please try again.'
          );
        }
      })
      .finally(() => {
        if (active) setLoadingSavedReturn(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepId]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key as string]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const setW2 = (id: string, field: keyof Omit<W2, 'id'>, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      w2s: prev.w2s.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
    }));
    setErrors((prev) => {
      const key = `${id}-${field}`;
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const a = answers;

  const steps: Step[] = [
    {
      id: 'filing-status',
      title: 'What is your filing status?',
      hint: 'Choose the status that fits your 2025 circumstances. The preview applies its 2025 tax brackets and standard deduction.',
      applies: () => true,
      validate: (x): Errors => (x.filingStatus ? {} : { filingStatus: 'Choose one to continue.' }),
      body: () => (
        <fieldset className="space-y-3">
          <legend className="sr-only">Filing status</legend>
          {FILING_OPTIONS.map((o) => (
            <Choice
              key={o.value}
              name="filing-status"
              value={o.value}
              label={o.label}
              help={o.help}
              checked={a.filingStatus === o.value}
              onChange={(v) => set('filingStatus', v as FilingStatus)}
            />
          ))}
          {errors.filingStatus && (
            <p role="alert" className="text-danger text-xs">
              {errors.filingStatus}
            </p>
          )}
        </fieldset>
      ),
    },
    {
      id: 'name',
      title: 'What is your name?',
      hint: 'Enter it exactly as it appears on your Social Security card.',
      applies: () => true,
      validate: (x): Errors => ({
        ...(x.firstName.trim() ? {} : { firstName: 'Enter your first name.' }),
        ...(x.lastName.trim() ? {} : { lastName: 'Enter your last name.' }),
        ...(x.filingStatus === 'mfj' || x.filingStatus === 'mfs'
          ? {
              ...(x.spouseFirstName.trim()
                ? {}
                : { spouseFirstName: 'Enter your spouse’s first name.' }),
              ...(x.spouseLastName.trim()
                ? {}
                : { spouseLastName: 'Enter your spouse’s last name.' }),
            }
          : {}),
      }),
      body: () => (
        <div className="space-y-4">
          <Field id="first-name" label="First name" error={errors.firstName}>
            <input
              id="first-name"
              type="text"
              autoComplete="given-name"
              value={a.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              aria-invalid={!!errors.firstName}
              aria-describedby={describedBy('first-name', undefined, errors.firstName)}
              className={`form-input-base ${errors.firstName ? 'form-input-error' : ''}`}
            />
          </Field>
          <Field id="last-name" label="Last name" error={errors.lastName}>
            <input
              id="last-name"
              type="text"
              autoComplete="family-name"
              value={a.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              aria-invalid={!!errors.lastName}
              aria-describedby={describedBy('last-name', undefined, errors.lastName)}
              className={`form-input-base ${errors.lastName ? 'form-input-error' : ''}`}
            />
          </Field>
          {(a.filingStatus === 'mfj' || a.filingStatus === 'mfs') && (
            <>
              <Field
                id="spouse-first-name"
                label="Spouse’s first name"
                error={errors.spouseFirstName}
              >
                <input
                  id="spouse-first-name"
                  type="text"
                  autoComplete="off"
                  value={a.spouseFirstName}
                  onChange={(e) => set('spouseFirstName', e.target.value)}
                  aria-invalid={!!errors.spouseFirstName}
                  aria-describedby={describedBy(
                    'spouse-first-name',
                    undefined,
                    errors.spouseFirstName
                  )}
                  className={`form-input-base ${errors.spouseFirstName ? 'form-input-error' : ''}`}
                />
              </Field>
              <Field id="spouse-last-name" label="Spouse’s last name" error={errors.spouseLastName}>
                <input
                  id="spouse-last-name"
                  type="text"
                  autoComplete="off"
                  value={a.spouseLastName}
                  onChange={(e) => set('spouseLastName', e.target.value)}
                  aria-invalid={!!errors.spouseLastName}
                  aria-describedby={describedBy(
                    'spouse-last-name',
                    undefined,
                    errors.spouseLastName
                  )}
                  className={`form-input-base ${errors.spouseLastName ? 'form-input-error' : ''}`}
                />
              </Field>
            </>
          )}
        </div>
      ),
    },
    {
      id: 'dob',
      title: 'When were you born?',
      hint: 'Your age can change your deductions and credits.',
      applies: () => true,
      validate: (x): Errors => {
        if (!x.dob) return { dob: 'Enter your date of birth.' };
        const d = new Date(`${x.dob}T00:00:00`);
        if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900)
          return { dob: 'Enter a valid date.' };
        if (d > new Date()) return { dob: 'Your date of birth cannot be in the future.' };
        return {};
      },
      body: () => (
        <Field id="dob" label="Date of birth" error={errors.dob}>
          <input
            id="dob"
            type="date"
            autoComplete="bday"
            value={a.dob}
            onChange={(e) => set('dob', e.target.value)}
            aria-invalid={!!errors.dob}
            aria-describedby={describedBy('dob', undefined, errors.dob)}
            className={`form-input-base ${errors.dob ? 'form-input-error' : ''}`}
          />
        </Field>
      ),
    },
    {
      id: 'spouse-dob',
      title: 'When was your spouse born?',
      hint: 'This helps determine the additional standard deduction for age 65 or older.',
      applies: (x) => x.filingStatus === 'mfj',
      validate: (x): Errors => {
        if (!x.spouseDob) return { spouseDob: 'Enter your spouse’s date of birth.' };
        const d = new Date(`${x.spouseDob}T00:00:00`);
        if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900)
          return { spouseDob: 'Enter a valid date.' };
        if (d > new Date()) return { spouseDob: 'The date of birth cannot be in the future.' };
        return {};
      },
      body: () => (
        <Field id="spouse-dob" label="Spouse’s date of birth" error={errors.spouseDob}>
          <input
            id="spouse-dob"
            type="date"
            value={a.spouseDob}
            onChange={(e) => set('spouseDob', e.target.value)}
            aria-invalid={!!errors.spouseDob}
            aria-describedby={describedBy('spouse-dob', undefined, errors.spouseDob)}
            className={`form-input-base ${errors.spouseDob ? 'form-input-error' : ''}`}
          />
        </Field>
      ),
    },
    {
      id: 'ssn',
      title: 'What is your Social Security number?',
      hint: 'The IRS needs it to match your return to your records. It is encrypted when saved.',
      applies: () => true,
      validate: (x): Errors => {
        const msg = validateSsn(x.ssn);
        const spouseMsg =
          x.filingStatus === 'mfj' || x.filingStatus === 'mfs' ? validateSsn(x.spouseSsn) : null;
        return {
          ...(msg ? { ssn: msg } : {}),
          ...(spouseMsg ? { spouseSsn: spouseMsg } : {}),
        };
      },
      body: () => (
        <div className="space-y-4">
          <Field id="ssn" label="Your Social Security number" error={errors.ssn}>
            <div className="relative">
              <input
                id="ssn"
                type={showSsn ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="off"
                placeholder="123-45-6789"
                value={a.ssn}
                onChange={(e) => set('ssn', formatSsn(e.target.value))}
                aria-invalid={!!errors.ssn}
                aria-describedby={describedBy('ssn', undefined, errors.ssn)}
                className={`form-input-base pr-16 tabular-nums ${errors.ssn ? 'form-input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowSsn((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:underline"
                aria-pressed={showSsn}
              >
                {showSsn ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          {(a.filingStatus === 'mfj' || a.filingStatus === 'mfs') && (
            <Field id="spouse-ssn" label="Spouse’s Social Security number" error={errors.spouseSsn}>
              <div className="relative">
                <input
                  id="spouse-ssn"
                  type={showSpouseSsn ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123-45-6789"
                  value={a.spouseSsn}
                  onChange={(e) => set('spouseSsn', formatSsn(e.target.value))}
                  aria-invalid={!!errors.spouseSsn}
                  aria-describedby={describedBy('spouse-ssn', undefined, errors.spouseSsn)}
                  className={`form-input-base pr-16 tabular-nums ${errors.spouseSsn ? 'form-input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowSpouseSsn((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:underline"
                  aria-pressed={showSpouseSsn}
                >
                  {showSpouseSsn ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          )}
        </div>
      ),
    },
    {
      id: 'spouse-deductions',
      title: 'Will your spouse itemize deductions?',
      hint: 'If your spouse itemizes on a married-filing-separately return, you cannot take the standard deduction.',
      applies: (x) => x.filingStatus === 'mfs',
      validate: (x): Errors =>
        x.spouseItemizes ? {} : { spouseItemizes: 'Choose yes or no to continue.' },
      body: () => (
        <fieldset className="space-y-3">
          <legend className="sr-only">Will your spouse itemize deductions?</legend>
          <Choice
            name="spouse-itemizes"
            value="yes"
            label="Yes, my spouse will itemize"
            checked={a.spouseItemizes === 'yes'}
            onChange={() => set('spouseItemizes', 'yes')}
          />
          <Choice
            name="spouse-itemizes"
            value="no"
            label="No, my spouse will not itemize"
            checked={a.spouseItemizes === 'no'}
            onChange={() => set('spouseItemizes', 'no')}
          />
          {errors.spouseItemizes && (
            <p role="alert" className="text-danger text-xs">
              {errors.spouseItemizes}
            </p>
          )}
        </fieldset>
      ),
    },
    {
      id: 'dependents',
      title: 'Do you claim any dependents?',
      hint: 'A dependent is usually a child or relative you support. Head of household and qualifying surviving spouse status require a qualifying dependent.',
      applies: () => true,
      validate: (x): Errors => {
        if (!x.hasDependents) return { hasDependents: 'Choose yes or no to continue.' };
        if (['hoh', 'qss'].includes(x.filingStatus) && x.hasDependents !== 'yes') {
          return {
            hasDependents:
              'This filing status requires a qualifying dependent. Review the IRS rules before continuing.',
          };
        }
        if (x.hasDependents === 'yes') {
          const n = Number(x.dependentCount);
          if (!Number.isInteger(n) || n < 1 || n > 10) {
            return { dependentCount: 'Enter a number from 1 to 10.' };
          }
        }
        return {};
      },
      body: () => (
        <div className="space-y-4">
          <fieldset className="space-y-3">
            <legend className="sr-only">Dependents</legend>
            <Choice
              name="dependents"
              value="yes"
              label="Yes, I claim at least one dependent"
              checked={a.hasDependents === 'yes'}
              onChange={() => set('hasDependents', 'yes')}
            />
            <Choice
              name="dependents"
              value="no"
              label="No dependents"
              checked={a.hasDependents === 'no'}
              onChange={() => set('hasDependents', 'no')}
            />
            {errors.hasDependents && (
              <p role="alert" className="text-danger text-xs">
                {errors.hasDependents}
              </p>
            )}
          </fieldset>
          {a.hasDependents === 'yes' && (
            <Field id="dependent-count" label="How many dependents?" error={errors.dependentCount}>
              <input
                id="dependent-count"
                type="text"
                inputMode="numeric"
                value={a.dependentCount}
                onChange={(e) => set('dependentCount', digitsOnly(e.target.value, 2))}
                aria-invalid={!!errors.dependentCount}
                aria-describedby={describedBy('dependent-count', undefined, errors.dependentCount)}
                className={`form-input-base tabular-nums ${errors.dependentCount ? 'form-input-error' : ''}`}
              />
            </Field>
          )}
        </div>
      ),
    },
    {
      id: 'has-w2',
      title: 'Did an employer pay you wages in 2025?',
      hint: 'Your employer reports these on a W-2 form, which they should have sent you by January 31.',
      applies: () => true,
      validate: (x): Errors => (x.hasW2 ? {} : { hasW2: 'Choose yes or no to continue.' }),
      body: () => (
        <fieldset className="space-y-3">
          <legend className="sr-only">Wages from an employer</legend>
          <Choice
            name="has-w2"
            value="yes"
            label="Yes, I have a W-2"
            checked={a.hasW2 === 'yes'}
            onChange={() => set('hasW2', 'yes')}
          />
          <Choice
            name="has-w2"
            value="no"
            label="No, I had no wages"
            checked={a.hasW2 === 'no'}
            onChange={() => set('hasW2', 'no')}
          />
          {errors.hasW2 && (
            <p role="alert" className="text-danger text-xs">
              {errors.hasW2}
            </p>
          )}
        </fieldset>
      ),
    },
    {
      id: 'w2s',
      title: 'Enter the details from your W-2',
      hint: 'Wages are in box 1. Federal tax withheld is in box 2. For a joint return, enter both spouses’ W-2s.',
      applies: (x) => x.hasW2 === 'yes',
      validate: (x) => {
        const out: Errors = {};
        x.w2s.forEach((w) => {
          if (!w.employer.trim()) out[`${w.id}-employer`] = 'Enter the employer name.';
          if (!w.wages) out[`${w.id}-wages`] = 'Enter the wages from box 1.';
          if (!w.withheld) out[`${w.id}-withheld`] = 'Enter the tax withheld from box 2, or 0.';
        });
        return out;
      },
      body: () => (
        <div className="space-y-5">
          {a.w2s.map((w, i) => (
            <div key={w.id} className="rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Employer {i + 1}</p>
                {a.w2s.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'w2s',
                        a.w2s.filter((x) => x.id !== w.id)
                      )
                    }
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <Field
                id={`${w.id}-employer`}
                label="Employer name"
                error={errors[`${w.id}-employer`]}
              >
                <input
                  id={`${w.id}-employer`}
                  type="text"
                  value={w.employer}
                  onChange={(e) => setW2(w.id, 'employer', e.target.value)}
                  aria-invalid={!!errors[`${w.id}-employer`]}
                  aria-describedby={describedBy(
                    `${w.id}-employer`,
                    undefined,
                    errors[`${w.id}-employer`]
                  )}
                  className={`form-input-base ${errors[`${w.id}-employer`] ? 'form-input-error' : ''}`}
                />
              </Field>
              <Field
                id={`${w.id}-wages`}
                label="Wages, tips and other pay (box 1)"
                error={errors[`${w.id}-wages`]}
              >
                <MoneyInput
                  id={`${w.id}-wages`}
                  value={w.wages}
                  onChange={(v) => setW2(w.id, 'wages', v)}
                  error={errors[`${w.id}-wages`]}
                />
              </Field>
              <Field
                id={`${w.id}-withheld`}
                label="Federal income tax withheld (box 2)"
                error={errors[`${w.id}-withheld`]}
              >
                <MoneyInput
                  id={`${w.id}-withheld`}
                  value={w.withheld}
                  onChange={(v) => setW2(w.id, 'withheld', v)}
                  error={errors[`${w.id}-withheld`]}
                />
              </Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set('w2s', [
                ...a.w2s,
                { id: `w2-${Date.now()}`, employer: '', wages: '', withheld: '' },
              ])
            }
            className="btn-secondary w-full text-sm"
          >
            Add another employer
          </button>
        </div>
      ),
    },
    {
      id: 'other-income',
      title: 'Did you earn interest or dividends?',
      hint: 'Banks and brokerages report these on Form 1099-INT and 1099-DIV. Leave a field blank if you have none.',
      applies: () => true,
      validate: () => ({}),
      body: () => (
        <div className="space-y-4">
          <Field id="interest" label="Total interest (1099-INT, box 1)">
            <MoneyInput id="interest" value={a.interest} onChange={(v) => set('interest', v)} />
          </Field>
          <Field id="dividends" label="Total ordinary dividends (1099-DIV, box 1a)">
            <MoneyInput id="dividends" value={a.dividends} onChange={(v) => set('dividends', v)} />
          </Field>
        </div>
      ),
    },
    {
      id: 'adjustments',
      title: 'Did you pay for any of these during 2025?',
      hint: 'These can lower your income before tax is calculated. Leave a field blank if it does not apply.',
      applies: () => true,
      validate: () => ({}),
      body: () => (
        <div className="space-y-4">
          <Field
            id="student-loan"
            label="Student loan interest paid (Form 1098-E)"
            hint="The preview applies the $2,500 limit and a basic income phaseout; eligibility can depend on other tax details."
          >
            <MoneyInput
              id="student-loan"
              value={a.studentLoanInterest}
              onChange={(v) => set('studentLoanInterest', v)}
            />
          </Field>
          <Field
            id="hsa"
            label="Deductible HSA contributions you made yourself"
            hint="Do not include employer contributions. Confirm the annual limit and eligibility for your coverage."
          >
            <MoneyInput id="hsa" value={a.hsa} onChange={(v) => set('hsa', v)} />
          </Field>
          <Field
            id="ira"
            label="Deductible traditional IRA contributions"
            hint="Enter only the amount you are eligible to deduct, not Roth or nondeductible contributions."
          >
            <MoneyInput id="ira" value={a.ira} onChange={(v) => set('ira', v)} />
          </Field>
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Check your answers',
      hint: 'You can go back to change anything. Next you will see your return line by line.',
      applies: () => true,
      validate: () => ({}),
      body: () => (
        <dl className="divide-y divide-border text-sm">
          {[
            ['Name', `${a.firstName} ${a.lastName}`.trim()],
            ...(a.filingStatus === 'mfj' || a.filingStatus === 'mfs'
              ? [['Spouse', `${a.spouseFirstName} ${a.spouseLastName}`.trim()]]
              : []),
            ['Filing status', FILING_OPTIONS.find((o) => o.value === a.filingStatus)?.label ?? ''],
            ['Social Security number', a.ssn ? `***-**-${a.ssn.slice(-4)}` : ''],
            ...(a.filingStatus === 'mfj' || a.filingStatus === 'mfs'
              ? [['Spouse SSN', a.spouseSsn ? `***-**-${a.spouseSsn.slice(-4)}` : '']]
              : []),
            ...(a.filingStatus === 'mfs'
              ? [['Spouse itemizes', a.spouseItemizes === 'yes' ? 'Yes' : 'No']]
              : []),
            ['Dependents', a.hasDependents === 'yes' ? a.dependentCount : 'None'],
            ['Wages', usd(total(a.hasW2 === 'yes' ? a.w2s.map((w) => w.wages) : []))],
            ['Tax withheld', usd(total(a.hasW2 === 'yes' ? a.w2s.map((w) => w.withheld) : []))],
            ['Interest and dividends', usd(total([a.interest, a.dividends]))],
            ['Adjustments', usd(total([a.studentLoanInterest, a.hsa, a.ira]))],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold text-foreground tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ];

  const visible = steps.filter((s) => s.applies(answers));
  const rawIndex = visible.findIndex((s) => s.id === stepId);
  const index = rawIndex === -1 ? 0 : rawIndex;
  const step = visible[index];
  const isReview = step.id === 'review';
  const questionCount = visible.length - 1;
  const progress = Math.round((index / visible.length) * 100);

  const goBack = () => {
    setErrors({});
    if (index > 0) setStepId(visible[index - 1].id);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const found = step.validate(answers);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    if (isReview) {
      setSaving(true);
      setSaveError('');
      try {
        const result = existingReturnId
          ? await api.put<{ id: string }>(`/returns/${encodeURIComponent(existingReturnId)}`, {
              answers,
            })
          : await api.post<{ id: string }>('/returns', { answers });
        router.push(`/return-review-filing?id=${encodeURIComponent(result.id)}`);
      } catch (error) {
        setSaveError(
          error instanceof ApiError
            ? error.message
            : 'We could not save your return. Please try again.'
        );
      } finally {
        setSaving(false);
      }
      return;
    }
    setStepId(visible[index + 1].id);
  };

  if (loadingSavedReturn) {
    return (
      <main className="min-h-screen grid place-items-center text-muted-foreground">
        Loading your saved interview…
      </main>
    );
  }
  if (loadError) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <div className="card-elevated-lg max-w-lg p-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Your interview could not be loaded</h1>
          <p role="alert" className="mt-2 text-sm text-danger">
            {loadError}
          </p>
          <Link
            href={`/return-review-filing?id=${encodeURIComponent(existingReturnId ?? '')}`}
            className="btn-primary inline-block mt-5"
          >
            Back to return review
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 bg-card border-b border-border flex items-center px-4 lg:px-8 gap-3 sticky top-0 z-20">
        <span className="font-bold text-foreground text-base">True North</span>
        <span className="text-border" aria-hidden="true">
          |
        </span>
        <span className="text-muted-foreground text-sm hidden sm:block">2025 federal return</span>
      </header>

      <main className="flex-1 flex justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          <div className="mb-5">
            <div
              className="progress-bar-track"
              role="progressbar"
              aria-label="Interview progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isReview ? 'Last step' : `Question ${index + 1} of ${questionCount}`}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="card-elevated-lg p-6 sm:p-8">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold text-foreground leading-snug outline-none"
            >
              {step.title}
            </h1>
            {step.hint && <p className="text-sm text-muted-foreground mt-2 mb-6">{step.hint}</p>}

            <div key={step.id}>{step.body()}</div>
            {saveError && (
              <p role="alert" className="text-danger text-sm mt-4">
                {saveError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 mt-8">
              {index > 0 ? (
                <button type="button" onClick={goBack} className="btn-secondary">
                  Back
                </button>
              ) : (
                <span />
              )}
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving your return…' : isReview ? 'Calculate my return' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
