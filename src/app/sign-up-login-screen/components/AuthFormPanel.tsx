'use client';
import { useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';

export default function AuthFormPanel() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 lg:hidden">
          <AppLogo variant="mark" height={34} />
          <span className="text-foreground font-bold text-xl">True North</span>
        </div>

        <h2 className="text-foreground font-bold text-3xl mb-1">
          {tab === 'login' ? 'Welcome back' : 'Start your return'}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          {tab === 'login'
            ? 'Sign in to continue your 2025 tax return.'
            : 'Create your free account to begin filing.'}
        </p>

        <div
          className="flex rounded-lg p-1 mb-6"
          style={{ background: 'var(--muted)' }}
          role="tablist"
        >
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={`tab-${t}`}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                tab === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'login' ? 'Returning filer' : 'New filer'}
            </button>
          ))}
        </div>

        {tab === 'login' ? <LoginForm /> : <SignUpForm onSwitchToLogin={() => setTab('login')} />}
      </div>
    </div>
  );
}
