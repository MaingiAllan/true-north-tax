/**
 * Sample 2025 federal return used by the review screen until the backend calculates real returns.
 * Every figure below is derived from the inputs, so the totals always agree with the lines.
 *
 * The sample stays separate from saved returns, which use the shared return calculator.
 *
 * Tax-year constants are for a Single filer. Confirm them against the IRS tables for the tax year
 * before relying on them, and move them into the tax engine package when it exists.
 */

export interface ReturnLine {
  line: string;
  description: string;
  amount: number;
  source?: string;
}

export interface ReturnSection {
  id: string;
  title: string;
  subtotal: number;
  subtotalLabel: string;
  lines: ReturnLine[];
}

export interface ReviewCheck {
  id: string;
  label: string;
  status: 'pass' | 'review';
  detail: string;
}

export interface CreditItem {
  id: string;
  name: string;
  form: string;
  amount: number;
}

export interface DeductionItem {
  id: string;
  name: string;
  where: string;
  amount: number;
}

export interface TaxForm {
  name: string;
  status:
    | 'included'
    | 'available'
    | 'not-applicable'
    | 'unsupported'
    | 'partial'
    | 'required'
    | 'entered'
    | 'not-entered';
  detail: string;
  url: string;
}

export interface ReturnData {
  taxpayer: string;
  filingStatus: string;
  taxYear: number;
  totalIncome: number;
  totalAdjustments: number;
  agi: number;
  standardDeduction: number;
  taxableIncome: number;
  totalCredits: number;
  totalTax: number;
  totalWithheld: number;
  estimatedPayments: number;
  totalPayments: number;
  /** Positive means a refund. Negative means the taxpayer owes money. */
  balance: number;
  effectiveRate: number;
  marginalRate: number;
  sections: ReturnSection[];
  forms: TaxForm[];
  checks: ReviewCheck[];
  credits: CreditItem[];
  deductions: DeductionItem[];
}

const STANDARD_DEDUCTION_SINGLE = 15750;

// Upper edge of each bracket (taxable income) and its rate, Single filer.
const BRACKETS_SINGLE: { upTo: number; rate: number }[] = [
  { upTo: 11925, rate: 0.1 },
  { upTo: 48475, rate: 0.12 },
  { upTo: 103350, rate: 0.22 },
  { upTo: 197300, rate: 0.24 },
  { upTo: 250525, rate: 0.32 },
  { upTo: 626350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

function taxFromBrackets(taxable: number) {
  let tax = 0;
  let lower = 0;
  let marginal = BRACKETS_SINGLE[0].rate;
  for (const b of BRACKETS_SINGLE) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, b.upTo) - lower) * b.rate;
    marginal = b.rate;
    lower = b.upTo;
  }
  return { tax: Math.round(tax), marginalRate: Math.round(marginal * 100) };
}

export function buildSampleReturn(): ReturnData {
  const wages = 87500;
  const interest = 340;
  const dividends = 820;
  const capitalGain = 1200;
  const hsa = 3850;
  const ira = 6500;
  const studentLoan = 2500;
  const withheld = 9600;
  const estimatedPayments = 0;

  const totalIncome = wages + interest + dividends + capitalGain;
  const totalAdjustments = hsa + ira + studentLoan;
  const agi = totalIncome - totalAdjustments;
  const standardDeduction = STANDARD_DEDUCTION_SINGLE;
  const taxableIncome = Math.max(0, agi - standardDeduction);
  const { tax, marginalRate } = taxFromBrackets(taxableIncome);
  const credits: CreditItem[] = [];
  const totalCredits = credits.reduce((s, c) => s + c.amount, 0);
  const totalTax = Math.max(0, tax - totalCredits);
  const totalPayments = withheld + estimatedPayments;
  const balance = totalPayments - totalTax;

  const sections: ReturnSection[] = [
    {
      id: 'section-income',
      title: 'Part I: Income',
      subtotal: totalIncome,
      subtotalLabel: 'Total income (line 9)',
      lines: [
        {
          line: '1a',
          description: 'Wages, salaries, tips (W-2 box 1)',
          amount: wages,
          source: 'W-2 · Sample Employer',
        },
        {
          line: '2b',
          description: 'Taxable interest',
          amount: interest,
          source: '1099-INT · Sample Bank',
        },
        {
          line: '3b',
          description: 'Ordinary dividends',
          amount: dividends,
          source: '1099-DIV · Sample Brokerage',
        },
        {
          line: '7',
          description: 'Capital gain or loss',
          amount: capitalGain,
          source: 'Schedule D',
        },
      ],
    },
    {
      id: 'section-adjustments',
      title: 'Part II: Adjustments to income',
      subtotal: agi,
      subtotalLabel: 'Adjusted gross income (line 11)',
      lines: [
        {
          line: '13',
          description: 'HSA deduction',
          amount: -hsa,
          source: 'Schedule 1, line 13 · Form 8889',
        },
        { line: '20', description: 'IRA deduction', amount: -ira, source: 'Schedule 1, line 20' },
        {
          line: '21',
          description: 'Student loan interest deduction',
          amount: -studentLoan,
          source: 'Schedule 1, line 21 · Form 1098-E',
        },
        { line: '11', description: 'Adjusted gross income', amount: agi, source: 'Calculated' },
      ],
    },
    {
      id: 'section-deductions',
      title: 'Part III: Standard deduction and taxable income',
      subtotal: taxableIncome,
      subtotalLabel: 'Taxable income (line 15)',
      lines: [
        {
          line: '12',
          description: 'Standard deduction (Single)',
          amount: -standardDeduction,
          source: 'IRS standard deduction',
        },
        { line: '15', description: 'Taxable income', amount: taxableIncome, source: 'Calculated' },
      ],
    },
    {
      id: 'section-tax',
      title: 'Part IV: Tax and credits',
      subtotal: totalTax,
      subtotalLabel: 'Total tax (line 24)',
      lines: [
        {
          line: '16',
          description: 'Tax from the tax rate schedule',
          amount: tax,
          source: 'IRS tax rates',
        },
        {
          line: '21',
          description: 'Total credits',
          amount: -totalCredits,
          source: 'None apply to this sample',
        },
        { line: '24', description: 'Total tax', amount: totalTax, source: 'Calculated' },
      ],
    },
    {
      id: 'section-payments',
      title: 'Part V: Payments',
      subtotal: totalPayments,
      subtotalLabel: 'Total payments (line 33)',
      lines: [
        {
          line: '25a',
          description: 'Federal income tax withheld (W-2 box 2)',
          amount: withheld,
          source: 'W-2 · Sample Employer',
        },
        {
          line: '26',
          description: 'Estimated tax payments',
          amount: estimatedPayments,
          source: 'Form 1040-ES',
        },
        { line: '33', description: 'Total payments', amount: totalPayments, source: 'Calculated' },
      ],
    },
    {
      id: 'section-refund',
      title: balance >= 0 ? 'Part VI: Refund' : 'Part VI: Amount you owe',
      subtotal: balance,
      subtotalLabel: balance >= 0 ? 'Amount overpaid' : 'Amount you owe',
      lines: [
        {
          line: '34',
          description: 'Amount you overpaid',
          amount: Math.max(0, balance),
          source: 'Total payments minus total tax',
        },
        {
          line: '37',
          description: 'Amount you owe',
          amount: Math.max(0, -balance),
          source: 'Total tax minus total payments',
        },
      ],
    },
  ];

  const checks: ReviewCheck[] = [
    {
      id: 'chk-income',
      label: 'Income adds up',
      status: 'pass',
      detail: 'Line 9 equals the sum of your income lines.',
    },
    {
      id: 'chk-withholding',
      label: 'Withholding matches your W-2',
      status: 'pass',
      detail: 'Tax withheld equals the box 2 amounts you entered.',
    },
    {
      id: 'chk-student-loan',
      label: 'Student loan interest',
      status: 'pass',
      detail: 'Within the $2,500 limit, and your income is below the phase-out.',
    },
    {
      id: 'chk-ira',
      label: 'IRA deduction',
      status: 'pass',
      detail: 'Within the annual contribution limit.',
    },
    {
      id: 'chk-hsa',
      label: 'HSA deduction',
      status: 'review',
      detail:
        'Employer contributions (W-2 box 12, code W) are not deductible. Confirm you paid this yourself.',
    },
    {
      id: 'chk-math',
      label: 'Refund equals payments minus tax',
      status: 'pass',
      detail: 'Lines 33, 24 and 34 agree.',
    },
  ];

  const deductions: DeductionItem[] = [
    {
      id: 'ded-standard',
      name: 'Standard deduction',
      where: 'Form 1040, line 12',
      amount: standardDeduction,
    },
    {
      id: 'ded-student-loan',
      name: 'Student loan interest',
      where: 'Schedule 1, line 21',
      amount: studentLoan,
    },
    { id: 'ded-hsa', name: 'HSA deduction', where: 'Schedule 1, line 13', amount: hsa },
    { id: 'ded-ira', name: 'IRA deduction', where: 'Schedule 1, line 20', amount: ira },
  ];

  return {
    taxpayer: 'Sample taxpayer',
    filingStatus: 'Single',
    taxYear: 2025,
    totalIncome,
    totalAdjustments,
    agi,
    standardDeduction,
    taxableIncome,
    totalCredits,
    totalTax,
    totalWithheld: withheld,
    estimatedPayments,
    totalPayments,
    balance,
    effectiveRate: Math.round((totalTax / agi) * 1000) / 10,
    marginalRate,
    sections,
    forms: [
      {
        name: 'Form 1040',
        status: 'included',
        detail: 'Illustrative individual return preview.',
        url: 'https://www.irs.gov/forms-pubs/about-form-1040',
      },
      {
        name: 'Form 1040-SR',
        status: 'not-applicable',
        detail: 'Generally available when the taxpayer or spouse is age 65 or older.',
        url: 'https://www.irs.gov/forms-pubs/about-form-1040-sr',
      },
      {
        name: 'Form 1040-X',
        status: 'unsupported',
        detail: 'Amended returns are not supported by this preview.',
        url: 'https://www.irs.gov/forms-pubs/about-form-1040-x',
      },
      ...[
        ['Schedule 1', 'partial', 'Some adjustment inputs are represented in this sample.'],
        ['Schedule 1-A', 'unsupported', 'Additional deductions are not calculated in this sample.'],
        ['Schedule 2', 'unsupported', 'Additional taxes are not calculated.'],
        ['Schedule 3', 'unsupported', 'Additional credits and payments are not calculated.'],
        ['Schedule A', 'unsupported', 'Itemized deductions are not calculated.'],
        ['Schedule B', 'not-applicable', 'Sample interest and dividends do not exceed $1,500.'],
        ['Schedule C', 'unsupported', 'Business income and expenses are not collected.'],
        ['Schedule D', 'unsupported', 'Capital gains and losses are not calculated.'],
        ['Schedule E', 'unsupported', 'Rental and pass-through income are not calculated.'],
        ['Schedule EIC', 'unsupported', 'Earned Income Credit eligibility is not calculated.'],
        ['Schedule SE', 'unsupported', 'Self-employment tax is not calculated.'],
        ['Schedule 8812', 'unsupported', 'Dependent credits are not calculated.'],
        ['W-2', 'entered', 'Illustrative wage and withholding information is included.'],
        ['1099-INT', 'entered', 'Illustrative taxable interest is included.'],
        ['1099-DIV', 'entered', 'Illustrative ordinary dividends are included.'],
        ['1098-E', 'entered', 'Illustrative student-loan interest is included.'],
        ['W-4', 'unsupported', 'A withholding certificate, not a Form 1040 filing attachment.'],
        [
          'Other 1099 forms',
          'unsupported',
          'Other income statements are not collected or calculated.',
        ],
        [
          'Other 1098 forms',
          'unsupported',
          'Mortgage-interest and tuition statements are not collected.',
        ],
        [
          '1095 series',
          'unsupported',
          'Health-coverage statements and related credits are not calculated.',
        ],
      ].map(([name, status, detail]) => ({
        name,
        status: status as TaxForm['status'],
        detail,
        url:
          name === 'W-2'
            ? 'https://www.irs.gov/forms-pubs/about-form-w-2'
            : name === '1099-INT'
              ? 'https://www.irs.gov/forms-pubs/about-form-1099-int'
              : name === '1099-DIV'
                ? 'https://www.irs.gov/forms-pubs/about-form-1099-div'
                : name === '1098-E'
                  ? 'https://www.irs.gov/forms-pubs/about-form-1098-e'
                  : name === 'W-4'
                    ? 'https://www.irs.gov/forms-pubs/about-form-w-4'
                    : ['Other 1099 forms', 'Other 1098 forms', '1095 series'].includes(name)
                      ? 'https://www.irs.gov/forms-instructions'
                      : `https://www.irs.gov/forms-pubs/about-${name.toLowerCase().replace(' ', '-')}-form-1040`,
      })),
    ],
    checks,
    credits,
    deductions,
  };
}

export const SAMPLE_RETURN = buildSampleReturn();
