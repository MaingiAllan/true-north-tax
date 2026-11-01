# True North

A guided US federal tax return app: answer one plain-language question at a time, review a
Form 1040 preview, then save filing details.

> **Status: early demo.** Email/password accounts, encrypted saved interview data, a limited
> individual-return tax preview, and encrypted filing-detail storage are connected to PostgreSQL.
> Google and Apple sign-in need provider credentials. The app is not an IRS-authorized e-file
> provider; it does not transmit returns to the IRS.

## Run locally

Requirements: Node.js 20.6 or later and PostgreSQL.

```bash
npm install
cp .env.example .env.local
createdb truenorth
```

Generate two keys with `openssl rand -hex 32` and `openssl rand -base64 32`. Paste the first
output into `JWT_SECRET` and the second into `DATA_ENCRYPTION_KEY` in `.env.local`. Set
`DATABASE_URL` to your PostgreSQL connection string, then run:

```bash
npm run dev
```

This starts the Next.js app at [http://localhost:4028](http://localhost:4028) and the Express API
at [http://localhost:4000](http://localhost:4000). The API applies `schema.sql` on startup.
PostgreSQL must be running. Do not commit `.env.local` or share its contents. Back up
`DATA_ENCRYPTION_KEY` securely; without it, encrypted tax and filing details cannot be read.

### OAuth setup

OAuth is optional for local development. To enable it, add provider credentials to `.env.local`
and register these callback URLs:

- Google: `http://localhost:4000/auth/google/callback`
- Apple: `http://localhost:4000/auth/apple/callback`

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google. For Apple, set
`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`; encode key newlines
as `\n`. For a deployed site, update `NEXT_PUBLIC_SITE_URL`, `API_PUBLIC_URL`, and callback URLs
to HTTPS addresses.

## Connected flows and limitations

- Sign-up and sign-in use a PostgreSQL account and an HTTP-only session cookie.
- Signing in resumes your most recently saved return. “Back to interview” reloads its encrypted
  answers; updating the interview recalculates the preview and clears saved filing details so
  they can be reviewed and re-entered.
- Completing the interview encrypts answers before storage and saves a calculated preview.
- The review page loads that saved return. Opening it without a return ID shows illustrative
  sample figures.
- Filing details are encrypted and saved to the return. They are **not submitted** to the IRS.
  The sample-return link never collects or saves bank details.
- Printing opens the browser print dialog; choose “Save as PDF” there.
- The 2025 calculation is a limited preview for Single, Married Filing Jointly, Married Filing
  Separately, Head of Household, and Qualifying Surviving Spouse statuses. It applies the 2025
  standard deductions, ordinary income tax brackets, age-based additional standard deduction,
  enhanced senior deduction, and a basic student-loan-interest phaseout. Form 1040-SR uses the
  same calculation as Form 1040. It uses the IRS tax table below $100,000 taxable income and the
  tax computation worksheet method above that threshold. See the review page's form list for
  included, partial, and unsupported forms.
- The preview does not calculate credits, itemized deductions, self-employment or investment income,
  capital gains or qualified-dividend tax treatment, other Schedule 1-A deductions, many eligibility
  limitations, or every tax-table/worksheet case.
  Married returns require spouse details; enter both spouses' W-2s for a joint return. Filing
  statuses are self-selected and eligibility must be verified against IRS instructions. The preview
  is not tax advice, a complete tax engine, or a filed return; have the figures reviewed before
  relying on them.
- Tax-year references: [2025 Instructions for Form 1040](https://www.irs.gov/instructions/i1040gi),
  [IRS Topic 551](https://www.irs.gov/taxtopics/tc551), and
  [2025 Schedule 1-A](https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf).
- IRS electronic filing needs separate provider authorization and an approved transmission
  integration. No app action currently sends a return to the IRS.
- The current sign-in flow does not implement multi-factor authentication or account recovery.

## Scripts

| Command              | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start the web app and API together |
| `npm run dev:api`    | Start the API only                 |
| `npm run build`      | Build for production               |
| `npm test`           | Run tax-calculator tests           |
| `npm run start`      | Serve the production web build     |
| `npm run start:api`  | Start the API for production       |
| `npm run lint`       | Check code quality with ESLint     |
| `npm run lint:fix`   | Fix lint problems automatically    |
| `npm run format`     | Format `src/` with Prettier        |
| `npm run type-check` | Check types without building       |

## Project structure

```
backend/server.mjs          Express API, authentication, returns and filing-detail routes
schema.sql                  Idempotent PostgreSQL schema
src/app/                    Next.js screens and return review
src/lib/api.ts              Browser API client
src/lib/return-calculator.mjs Shared limited-preview calculator
src/lib/sample-return.ts    Sample data shown by the sample-return link
```

## Before launch

- Add multi-factor authentication and account recovery.
- Expand and independently validate the tax calculation engine.
- Complete deployment-specific Google/Apple setup and a security review.
- Obtain IRS e-file provider authorization and integrate an approved transmission service before
  enabling electronic filing.
- Write the Terms of Service and Privacy Policy referenced on the sign-up screen, and have the
  filing declaration reviewed by a tax or legal professional.
# true-north-tax
