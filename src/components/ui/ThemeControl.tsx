'use client';

import { useEffect, useState } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'true-north-theme';

function applyTheme(preference: ThemePreference) {
  if (preference === 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
}

export default function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setPreference(saved);
      }
    } catch {
      setSaveError(true);
    }
  }, []);

  const handleChange = (nextPreference: ThemePreference) => {
    setPreference(nextPreference);
    setSaveError(false);
    applyTheme(nextPreference);

    try {
      if (nextPreference === 'system') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, nextPreference);
      }
    } catch {
      setSaveError(true);
    }
  };

  return (
    <div className="theme-control fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-lg print:hidden">
      <svg
        className="h-4 w-4 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </svg>
      <label htmlFor="theme-preference" className="text-xs font-semibold text-foreground">
        Theme
      </label>
      <select
        id="theme-preference"
        value={preference}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'system' || value === 'light' || value === 'dark') {
            handleChange(value);
          }
        }}
        className="theme-select rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <option value="system">System (automatic)</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      {saveError && (
        <span role="status" className="sr-only">
          The theme preference could not be saved in this browser.
        </span>
      )}
    </div>
  );
}
