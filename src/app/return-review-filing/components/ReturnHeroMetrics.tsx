import type { ReturnData } from '@/lib/sample-return';

interface Props {
  data: ReturnData;
}

const usd = (n: number) => `$${Math.abs(n).toLocaleString('en-US')}`;

export default function ReturnHeroMetrics({ data }: Props) {
  const isRefund = data.balance >= 0;

  const metrics = [
    {
      id: 'metric-agi',
      label: 'Adjusted gross income',
      value: usd(data.agi),
      sub: 'Form 1040, line 11',
    },
    {
      id: 'metric-taxable',
      label: 'Taxable income',
      value: usd(data.taxableIncome),
      sub: 'Form 1040, line 15',
    },
    {
      id: 'metric-effective-rate',
      label: 'Effective tax rate',
      value: `${data.effectiveRate}%`,
      sub: `${data.marginalRate}% marginal bracket`,
    },
    {
      id: 'metric-withheld',
      label: 'Tax withheld',
      value: usd(data.totalWithheld),
      sub: 'From your W-2',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
      <div
        className={`xl:col-span-2 rounded-2xl p-6 border-2 ${
          isRefund ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}
      >
        <p className="text-sm font-semibold text-muted-foreground mb-1">
          {isRefund ? 'Federal refund' : 'Federal balance due'}
        </p>
        <p className={`text-hero-refund mb-2 ${isRefund ? 'text-accent' : 'text-danger'}`}>
          {isRefund ? '+' : '-'}
          {usd(data.balance)}
        </p>
        <p className="text-xs text-muted-foreground">
          Total payments {usd(data.totalPayments)} minus total tax {usd(data.totalTax)}.
        </p>
      </div>

      {metrics.map((m) => (
        <div key={m.id} className="card-elevated p-4 xl:col-span-1">
          <p className="text-xs font-semibold text-muted-foreground mb-1">{m.label}</p>
          <p className="text-metric-value text-foreground mb-1">{m.value}</p>
          <p className="text-xs text-muted-foreground">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}
