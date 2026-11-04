import AppLogo from '@/components/ui/AppLogo';

const highlights = [
  {
    id: 'hl-one-question',
    title: 'One question at a time',
    text: 'Plain-language questions with a short explanation under each one.',
  },
  {
    id: 'hl-line-by-line',
    title: 'See every line before you file',
    text: 'Your whole Form 1040 is laid out line by line, with the source of each number.',
  },
  {
    id: 'hl-checks',
    title: 'Checks on your numbers',
    text: 'True North flags totals that do not add up and deductions that may be too high.',
  },
];

export default function AuthBrandPanel() {
  return (
    <div className="auth-brand-panel hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-full px-10 py-10 xl:px-14">
        <div className="auth-logo-surface inline-flex self-start rounded-2xl p-4 shadow-sm mb-12">
          <AppLogo variant="full" height={110} />
        </div>

        <div className="mb-10">
          <h1 className="auth-brand-primary-text font-bold text-4xl xl:text-5xl leading-tight mb-4">
            Tax filing, one clear question at a time.
          </h1>
          <p className="auth-brand-secondary-text text-lg leading-relaxed max-w-md">
            Prepare your US federal return step by step, then review every line before you file.
          </p>
        </div>

        <ul className="space-y-4 max-w-md">
          {highlights.map((h) => (
            <li key={h.id} className="auth-brand-highlight rounded-xl p-4">
              <p className="auth-brand-primary-text text-sm font-semibold mb-0.5">{h.title}</p>
              <p className="auth-brand-secondary-text text-sm leading-relaxed">{h.text}</p>
            </li>
          ))}
        </ul>

        <p className="auth-brand-secondary-text mt-auto text-xs">
          Your connection to True North is encrypted with HTTPS.
        </p>
      </div>
    </div>
  );
}
