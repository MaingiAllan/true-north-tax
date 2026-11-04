import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

interface Props {
  taxpayer: string;
  taxYear: number;
  returnId?: string;
}

export default function ReturnTopbar({ taxpayer, taxYear, returnId }: Props) {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 lg:px-8 gap-4 flex-shrink-0 z-20 sticky top-0">
      <div className="flex items-center gap-3">
        <AppLogo variant="mark" height={30} />
        <span className="font-bold text-foreground text-base">True North</span>
        <span className="text-border" aria-hidden="true">
          |
        </span>
        <span className="text-muted-foreground text-sm hidden sm:block">
          {taxYear} federal return: final review
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href={
            returnId ? `/tax-interview?returnId=${encodeURIComponent(returnId)}` : '/tax-interview'
          }
          className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to interview
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          Print / save PDF
        </button>
        <div
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold"
          aria-label={taxpayer}
        >
          {taxpayer.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
