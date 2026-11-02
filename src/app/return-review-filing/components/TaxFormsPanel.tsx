import type { TaxForm } from '@/lib/sample-return';

const STATUS_LABELS: Record<TaxForm['status'], string> = {
  included: 'In preview',
  available: 'Available',
  'not-applicable': 'Not applicable',
  unsupported: 'Not supported',
  partial: 'Partial',
  required: 'May be required',
  entered: 'Entered',
  'not-entered': 'Not entered',
};

interface Props {
  forms?: TaxForm[];
}

export default function TaxFormsPanel({ forms }: Props) {
  const availableForms = Array.isArray(forms) ? forms : [];

  return (
    <section className="card-elevated-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-base font-bold text-foreground">Forms and supporting documents</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          See what this preview includes and which forms need separate preparation.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {availableForms.length > 0 ? (
          availableForms.map((form) => (
            <li
              key={form.name}
              className="p-4 flex flex-col gap-1.5 sm:flex-row sm:justify-between"
            >
              <div className="min-w-0">
                <a
                  href={form.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {form.name}
                </a>
                <p className="text-xs text-muted-foreground mt-0.5">{form.detail}</p>
              </div>
              <span className="badge-base bg-muted text-muted-foreground shrink-0 self-start">
                {STATUS_LABELS[form.status]}
              </span>
            </li>
          ))
        ) : (
          <li className="p-4 text-sm text-muted-foreground">
            Form details are not available for this saved preview.
          </li>
        )}
      </ul>
      <p className="px-4 py-3 bg-muted/40 border-t border-border text-xs text-muted-foreground">
        Business, estate and trust, tax-exempt organization, employer/payroll, and IRS
        information-return filing flows are outside this individual-return preview.
      </p>
    </section>
  );
}
