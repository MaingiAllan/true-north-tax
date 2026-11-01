import type { ReviewCheck } from '@/lib/sample-return';

interface Props {
  checks: ReviewCheck[];
}

export default function ReviewChecksPanel({ checks }: Props) {
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const reviewCount = checks.length - passCount;

  return (
    <div className="card-elevated-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Review checks</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Checks True North ran on the numbers in this return.
        </p>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <span className="badge-base" style={{ background: '#dcfce7', color: '#15803d' }}>
            {passCount} passed
          </span>
          {reviewCount > 0 && (
            <span className="badge-base" style={{ background: '#fef3c7', color: '#b45309' }}>
              {reviewCount} to review
            </span>
          )}
        </div>
        <ul className="space-y-1">
          {checks.map((check) => (
            <li
              key={check.id}
              className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  check.status === 'pass' ? 'bg-green-100' : 'bg-amber-100'
                }`}
              >
                {check.status === 'pass' ? (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--warning)"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {check.label}
                  <span className="sr-only">
                    {check.status === 'pass' ? ' (passed)' : ' (needs review)'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
