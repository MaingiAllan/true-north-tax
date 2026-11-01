'use client';
import { useState } from 'react';
import type { ReturnSection } from '@/lib/sample-return';

interface Props {
  sections: ReturnSection[];
}

const money = (n: number) =>
  n === 0 ? '—' : `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US')}`;

export default function Form1040Accordion({ sections }: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set([sections[0]?.id].filter(Boolean) as string[])
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="card-elevated-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-base font-bold text-foreground">Form 1040, line by line</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Open a section to see each line and where the number came from.
        </p>
      </div>

      <div className="divide-y divide-border">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);
          const isRefundSection = section.id === 'section-refund';
          const panelId = `${section.id}-panel`;

          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                    className={`transition-transform duration-200 text-muted-foreground flex-shrink-0 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ml-2 ${
                    isRefundSection && section.subtotal >= 0 ? 'text-accent' : 'text-foreground'
                  }`}
                >
                  {section.subtotal < 0 ? '-' : ''}$
                  {Math.abs(section.subtotal).toLocaleString('en-US')}
                </span>
              </button>

              {isOpen && (
                <div id={panelId} className="bg-muted/40 border-t border-border animate-fade-in">
                  <div className="divide-y divide-border/60">
                    {section.lines.map((line) => (
                      <div
                        key={`${section.id}-line-${line.line}-${line.description}`}
                        className="flex items-start justify-between px-6 py-2.5"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                            {line.line}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">
                              {line.description}
                            </p>
                            {line.source && (
                              <p className="text-xs text-muted-foreground mt-0.5">{line.source}</p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold tabular-nums ml-3 flex-shrink-0 ${
                            line.amount < 0
                              ? 'text-primary'
                              : line.amount === 0
                                ? 'text-muted-foreground'
                                : 'text-foreground'
                          }`}
                        >
                          {money(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-muted">
                    <span className="text-xs font-bold text-foreground">
                      {section.subtotalLabel}
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isRefundSection && section.subtotal >= 0 ? 'text-accent' : 'text-foreground'
                      }`}
                    >
                      ${Math.abs(section.subtotal).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
