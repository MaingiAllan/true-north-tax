'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReturnTopbar from './ReturnTopbar';
import ReturnHeroMetrics from './ReturnHeroMetrics';
import Form1040Accordion from './Form1040Accordion';
import TaxFormsPanel from './TaxFormsPanel';
import EFileSubmissionPanel from './EFileSubmissionPanel';
import ReviewChecksPanel from './ReviewChecksPanel';
import CreditsDeductionsSummary from './CreditsDeductionsSummary';
import { SAMPLE_RETURN } from '@/lib/sample-return';
import type { ReturnData } from '@/lib/sample-return';
import { api, ApiError } from '@/lib/api';
import { calculateReturn } from '@/lib/return-calculator.mjs';
import type { InterviewAnswers } from '@/lib/return-calculator.mjs';

interface ReturnResponse {
  id: string;
  data: ReturnData;
  status: string;
  filingDetailsSaved: boolean;
}

const DEMO_STATUSES = ['single', 'mfj', 'mfs', 'hoh', 'qss'] as const;
type DemoStatus = (typeof DEMO_STATUSES)[number];

const DEMO_ANSWERS: Record<DemoStatus, InterviewAnswers> = {
  single: {
    filingStatus: 'single',
    firstName: 'Maya',
    lastName: 'Chen',
    dob: '1992-04-18',
    ssn: '',
    spouseFirstName: '',
    spouseLastName: '',
    spouseDob: '',
    spouseSsn: '',
    spouseItemizes: '',
    hasDependents: 'no',
    dependentCount: '',
    hasW2: 'yes',
    w2s: [{ id: 'demo-w2', employer: 'Northstar Studio', wages: '72000', withheld: '8200' }],
    interest: '240',
    dividends: '180',
    studentLoanInterest: '900',
    hsa: '',
    ira: '',
  },
  mfj: {
    filingStatus: 'mfj',
    firstName: 'Jordan',
    lastName: 'Kim',
    dob: '1988-09-12',
    ssn: '',
    spouseFirstName: 'Avery',
    spouseLastName: 'Kim',
    spouseDob: '1989-02-26',
    spouseSsn: '',
    spouseItemizes: '',
    hasDependents: 'yes',
    dependentCount: '1',
    hasW2: 'yes',
    w2s: [{ id: 'demo-w2', employer: 'Pine & Co.', wages: '108000', withheld: '12500' }],
    interest: '510',
    dividends: '320',
    studentLoanInterest: '',
    hsa: '1800',
    ira: '',
  },
  mfs: {
    filingStatus: 'mfs',
    firstName: 'Sam',
    lastName: 'Rivera',
    dob: '1985-06-07',
    ssn: '',
    spouseFirstName: 'Lee',
    spouseLastName: 'Rivera',
    spouseDob: '',
    spouseSsn: '',
    spouseItemizes: 'no',
    hasDependents: 'no',
    dependentCount: '',
    hasW2: 'yes',
    w2s: [{ id: 'demo-w2', employer: 'Cedar Works', wages: '64000', withheld: '7200' }],
    interest: '125',
    dividends: '',
    studentLoanInterest: '',
    hsa: '',
    ira: '1500',
  },
  hoh: {
    filingStatus: 'hoh',
    firstName: 'Taylor',
    lastName: 'Brooks',
    dob: '1990-11-03',
    ssn: '',
    spouseFirstName: '',
    spouseLastName: '',
    spouseDob: '',
    spouseSsn: '',
    spouseItemizes: '',
    hasDependents: 'yes',
    dependentCount: '1',
    hasW2: 'yes',
    w2s: [{ id: 'demo-w2', employer: 'Bluebird Market', wages: '56000', withheld: '5900' }],
    interest: '95',
    dividends: '',
    studentLoanInterest: '',
    hsa: '',
    ira: '',
  },
  qss: {
    filingStatus: 'qss',
    firstName: 'Casey',
    lastName: 'Morgan',
    dob: '1987-01-22',
    ssn: '',
    spouseFirstName: '',
    spouseLastName: '',
    spouseDob: '',
    spouseSsn: '',
    spouseItemizes: '',
    hasDependents: 'yes',
    dependentCount: '1',
    hasW2: 'yes',
    w2s: [{ id: 'demo-w2', employer: 'Summit Supply', wages: '61500', withheld: '6800' }],
    interest: '210',
    dividends: '75',
    studentLoanInterest: '',
    hsa: '',
    ira: '',
  },
};

function isDemoStatus(value: string | null): value is DemoStatus {
  return value !== null && DEMO_STATUSES.includes(value as DemoStatus);
}

export default function ReturnReviewShell() {
  const searchParams = useSearchParams();
  const returnId = searchParams.get('id');
  const demoStatus = searchParams.get('demo');
  const demoData = isDemoStatus(demoStatus) ? calculateReturn(DEMO_ANSWERS[demoStatus]) : null;
  const [returnRecord, setReturnRecord] = useState<ReturnResponse | null>(null);
  const [loading, setLoading] = useState(!!returnId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!returnId) {
      setLoading(false);
      return;
    }

    let active = true;
    api
      .get<ReturnResponse>(`/returns/${encodeURIComponent(returnId)}`)
      .then((result) => {
        if (active) setReturnRecord(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : 'We could not load your return. Please try again.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [returnId]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center text-muted-foreground">
        Loading your return…
      </main>
    );
  }
  if (error || (returnId && !returnRecord)) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <div className="card-elevated-lg max-w-lg p-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Your return could not be loaded</h1>
          <p role="alert" className="mt-2 text-sm text-danger">
            {error || 'Return not found.'}
          </p>
          <Link href="/tax-interview" className="btn-primary inline-block mt-5">
            Back to interview
          </Link>
        </div>
      </main>
    );
  }

  const data = returnRecord?.data ?? demoData ?? SAMPLE_RETURN;
  const isSample = !returnRecord;
  const isDemo = !returnRecord && demoData !== null;

  return (
    <div className="min-h-screen bg-background">
      <ReturnTopbar taxpayer={data.taxpayer} taxYear={data.taxYear} returnId={returnRecord?.id} />
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div
          role="note"
          className="surface-warning mb-6 rounded-lg border px-4 py-3 text-sm text-foreground"
        >
          {isSample ? (
            isDemo ? (
              <>
                <span className="font-semibold">Fictional demo return · {data.filingStatus}.</span>{' '}
                It uses sample answers and contains no Social Security numbers.
              </>
            ) : (
              <>
                <span className="font-semibold">This is a sample return.</span> The figures are
                illustrative and are not based on your answers.
              </>
            )
          ) : (
            <>
              <span className="font-semibold">
                This is a limited tax preview, not a filed return.
              </span>{' '}
              Verify all information and eligibility before relying on these figures. This demo
              calculates a limited 2025 federal preview. It does not include every tax form, credit,
              limitation, or eligibility rule.
            </>
          )}
        </div>

        <ReturnHeroMetrics data={data} />

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-3 space-y-5">
            <ReviewChecksPanel checks={data.checks} />
            <CreditsDeductionsSummary credits={data.credits} deductions={data.deductions} />
          </div>

          <div className="xl:col-span-5">
            <Form1040Accordion sections={data.sections} />
          </div>

          <div className="xl:col-span-4">
            <EFileSubmissionPanel
              balance={data.balance}
              returnId={returnRecord?.id}
              filingDetailsSaved={returnRecord?.filingDetailsSaved}
            />
          </div>
        </div>
        <div className="mt-6">
          <TaxFormsPanel forms={data.forms} />
        </div>
      </div>
    </div>
  );
}
