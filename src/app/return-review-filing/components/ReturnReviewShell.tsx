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

interface ReturnResponse {
  id: string;
  data: ReturnData;
  status: string;
  filingDetailsSaved: boolean;
}

export default function ReturnReviewShell() {
  const searchParams = useSearchParams();
  const returnId = searchParams.get('id');
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

  const data = returnRecord?.data ?? SAMPLE_RETURN;
  const isSample = !returnRecord;

  return (
    <div className="min-h-screen bg-background">
      <ReturnTopbar taxpayer={data.taxpayer} taxYear={data.taxYear} returnId={returnRecord?.id} />
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div
          role="note"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-foreground"
        >
          {isSample ? (
            <>
              <span className="font-semibold">This is a sample return.</span> The figures are
              illustrative and are not based on your answers.
            </>
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
