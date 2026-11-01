import type { CreditItem, DeductionItem } from '@/lib/sample-return';

interface Props {
  credits: CreditItem[];
  deductions: DeductionItem[];
}

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

export default function CreditsDeductionsSummary({ credits, deductions }: Props) {
  const totalCredits = credits.reduce((s, c) => s + c.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="card-elevated-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Tax credits</h2>
          <span className="text-sm font-bold text-accent tabular-nums">-{usd(totalCredits)}</span>
        </div>
        {credits.length === 0 ? (
          <p className="text-xs text-muted-foreground">No credits apply to this return.</p>
        ) : (
          <ul className="space-y-1.5">
            {credits.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.form}</p>
                </div>
                <span className="text-xs font-bold tabular-nums text-accent">-{usd(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Deductions</h2>
          <span className="text-sm font-bold text-primary tabular-nums">
            -{usd(totalDeductions)}
          </span>
        </div>
        <ul className="space-y-1.5">
          {deductions.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-semibold text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.where}</p>
              </div>
              <span className="text-xs font-bold text-primary tabular-nums">-{usd(d.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
