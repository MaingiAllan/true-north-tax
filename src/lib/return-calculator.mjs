const STATUS = {
  single: {
    label: 'Single',
    standardDeduction: 15750,
    seniorAgeDeduction: 2000,
    seniorIncomeLimit: 75000,
    brackets: [
      [11925, 0.1],
      [48475, 0.12],
      [103350, 0.22],
      [197300, 0.24],
      [250525, 0.32],
      [626350, 0.35],
      [Infinity, 0.37],
    ],
  },
  mfj: {
    label: 'Married filing jointly',
    standardDeduction: 31500,
    seniorAgeDeduction: 1600,
    seniorIncomeLimit: 150000,
    brackets: [
      [23850, 0.1],
      [96950, 0.12],
      [206700, 0.22],
      [394600, 0.24],
      [501050, 0.32],
      [751600, 0.35],
      [Infinity, 0.37],
    ],
  },
  mfs: {
    label: 'Married filing separately',
    standardDeduction: 15750,
    seniorAgeDeduction: 1600,
    seniorIncomeLimit: 75000,
    brackets: [
      [11925, 0.1],
      [48475, 0.12],
      [103350, 0.22],
      [197300, 0.24],
      [250525, 0.32],
      [375800, 0.35],
      [Infinity, 0.37],
    ],
  },
  hoh: {
    label: 'Head of household',
    standardDeduction: 23625,
    seniorAgeDeduction: 2000,
    seniorIncomeLimit: 75000,
    brackets: [
      [17000, 0.1],
      [64850, 0.12],
      [103350, 0.22],
      [197300, 0.24],
      [250500, 0.32],
      [626350, 0.35],
      [Infinity, 0.37],
    ],
  },
  qss: {
    label: 'Qualifying surviving spouse',
    standardDeduction: 31500,
    seniorAgeDeduction: 1600,
    seniorIncomeLimit: 75000,
    brackets: [
      [23850, 0.1],
      [96950, 0.12],
      [206700, 0.22],
      [394600, 0.24],
      [501050, 0.32],
      [751600, 0.35],
      [Infinity, 0.37],
    ],
  },
};

const amount = (value) => Number.parseInt(value || '0', 10) || 0;
const isSenior = (dob) =>
  typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dob) && dob <= '1961-01-01';

function taxFromBrackets(taxableIncome, brackets) {
  let tax = 0;
  let lower = 0;
  let marginalRate = 10;

  for (const [upper, rate] of brackets) {
    if (taxableIncome <= lower) break;
    tax += (Math.min(taxableIncome, upper) - lower) * rate;
    marginalRate = rate * 100;
    lower = upper;
  }

  if (taxableIncome === 0) return { tax: 0, marginalRate };
  if (taxableIncome < 100000) {
    const taxTableMidpoint = Math.floor(taxableIncome / 50) * 50 + 25;
    let tableTax = 0;
    let tableLower = 0;
    for (const [upper, rate] of brackets) {
      if (taxTableMidpoint <= tableLower) break;
      tableTax += (Math.min(taxTableMidpoint, upper) - tableLower) * rate;
      tableLower = upper;
    }
    return { tax: Math.round(tableTax), marginalRate };
  }
  return { tax: Math.round(tax), marginalRate };
}

export function calculateReturn(answers) {
  const filing = STATUS[answers.filingStatus] ?? STATUS.single;
  const wages =
    answers.hasW2 === 'yes' ? answers.w2s.reduce((sum, w2) => sum + amount(w2.wages), 0) : 0;
  const withheld =
    answers.hasW2 === 'yes' ? answers.w2s.reduce((sum, w2) => sum + amount(w2.withheld), 0) : 0;
  const interest = amount(answers.interest);
  const dividends = amount(answers.dividends);
  const studentLoanInterest = amount(answers.studentLoanInterest);
  const hsa = amount(answers.hsa);
  const ira = amount(answers.ira);
  const totalIncome = wages + interest + dividends;
  const agiBeforeStudentLoan = Math.max(0, totalIncome - hsa - ira);
  const studentLoanPhaseoutStart = answers.filingStatus === 'mfj' ? 170000 : 85000;
  const studentLoanPhaseoutEnd = answers.filingStatus === 'mfj' ? 200000 : 100000;
  const studentLoan =
    answers.filingStatus === 'mfs'
      ? 0
      : Math.round(
          Math.min(studentLoanInterest, 2500) *
            Math.max(
              0,
              Math.min(
                1,
                (studentLoanPhaseoutEnd - agiBeforeStudentLoan) /
                  (studentLoanPhaseoutEnd - studentLoanPhaseoutStart)
              )
            )
        );
  const totalAdjustments = studentLoan + hsa + ira;
  const agi = Math.max(0, totalIncome - totalAdjustments);
  const taxpayerSenior = isSenior(answers.dob);
  const spouseSenior = answers.filingStatus === 'mfj' && isSenior(answers.spouseDob);
  const standardAgeDeduction =
    (taxpayerSenior ? filing.seniorAgeDeduction : 0) +
    (spouseSenior ? filing.seniorAgeDeduction : 0);
  const spouseItemizes = answers.filingStatus === 'mfs' && answers.spouseItemizes === 'yes';
  const standardDeduction = spouseItemizes ? 0 : filing.standardDeduction + standardAgeDeduction;
  const seniorDeductionEligible =
    answers.filingStatus !== 'mfs' && (taxpayerSenior || spouseSenior);
  const seniorIncomeLimit = filing.seniorIncomeLimit;
  const seniorDeduction =
    seniorDeductionEligible && agi < seniorIncomeLimit + 100000
      ? [taxpayerSenior, spouseSenior]
          .filter(Boolean)
          .reduce(
            (total, _senior) =>
              total + Math.max(0, Math.round(6000 - Math.max(0, agi - seniorIncomeLimit) * 0.06)),
            0
          )
      : 0;
  const taxableIncome = Math.max(0, agi - standardDeduction - seniorDeduction);
  const { tax, marginalRate } = taxFromBrackets(taxableIncome, filing.brackets);
  const totalTax = tax;
  const totalPayments = withheld;
  const balance = totalPayments - totalTax;
  const primaryTaxpayer = `${answers.firstName} ${answers.lastName}`.trim();
  const jointSpouse = `${answers.spouseFirstName ?? ''} ${answers.spouseLastName ?? ''}`.trim();
  const taxpayer =
    answers.filingStatus === 'mfj' && jointSpouse
      ? `${primaryTaxpayer} and ${jointSpouse}`
      : primaryTaxpayer;
  const w2Source = 'W-2 forms entered';

  const sections = [
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
          source: w2Source,
        },
        { line: '2b', description: 'Taxable interest', amount: interest },
        { line: '3b', description: 'Ordinary dividends', amount: dividends },
        { line: '9', description: 'Total income', amount: totalIncome, source: 'Calculated' },
      ],
    },
    {
      id: 'section-adjustments',
      title: 'Part II: Adjustments to income',
      subtotal: agi,
      subtotalLabel: 'Adjusted gross income (line 11)',
      lines: [
        { line: '13', description: 'HSA contributions', amount: -hsa },
        { line: '20', description: 'Traditional IRA contributions', amount: -ira },
        { line: '21', description: 'Student loan interest deduction', amount: -studentLoan },
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
          description: `Standard deduction (${filing.label})`,
          amount: -standardDeduction,
        },
        ...(seniorDeduction > 0
          ? [
              {
                line: '13b',
                description: 'Enhanced deduction for seniors (Schedule 1-A)',
                amount: -seniorDeduction,
              },
            ]
          : []),
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
          description:
            taxableIncome < 100000
              ? 'Tax from 2025 IRS tax table'
              : 'Tax from 2025 IRS tax computation worksheet',
          amount: tax,
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
        { line: '25a', description: 'Federal income tax withheld (W-2 box 2)', amount: withheld },
        { line: '33', description: 'Total payments', amount: totalPayments, source: 'Calculated' },
      ],
    },
    {
      id: 'section-refund',
      title: balance >= 0 ? 'Part VI: Refund' : 'Part VI: Amount you owe',
      subtotal: balance,
      subtotalLabel: balance >= 0 ? 'Amount overpaid' : 'Amount you owe',
      lines: [
        { line: '34', description: 'Amount you overpaid', amount: Math.max(0, balance) },
        { line: '37', description: 'Amount you owe', amount: Math.max(0, -balance) },
      ],
    },
  ];

  const deductions = [
    {
      id: 'ded-standard',
      name: 'Standard deduction',
      where: 'Form 1040, line 12',
      amount: standardDeduction,
    },
    ...(seniorDeduction > 0
      ? [
          {
            id: 'ded-senior',
            name: 'Enhanced deduction for seniors',
            where: 'Schedule 1-A, Form 1040, line 13b',
            amount: seniorDeduction,
          },
        ]
      : []),
    ...(studentLoanInterest > 0
      ? [
          {
            id: 'ded-student-loan',
            name: 'Student loan interest deduction',
            where: 'Schedule 1, line 21',
            amount: studentLoan,
          },
        ]
      : []),
    { id: 'ded-hsa', name: 'HSA contributions', where: 'Schedule 1', amount: hsa },
    { id: 'ded-ira', name: 'Traditional IRA contributions', where: 'Schedule 1', amount: ira },
  ].filter((deduction) => deduction.amount > 0);

  const schedule1Used = studentLoanInterest > 0 || hsa > 0 || ira > 0;
  const forms = [
    {
      name: 'Form 1040',
      status: 'included',
      detail: 'Individual return preview calculated from the information entered.',
      url: 'https://www.irs.gov/forms-pubs/about-form-1040',
    },
    {
      name: 'Form 1040-SR',
      status: taxpayerSenior || spouseSenior ? 'available' : 'not-applicable',
      detail:
        taxpayerSenior || spouseSenior
          ? 'Senior-friendly version; the tax calculation is the same as Form 1040.'
          : 'Generally available when the taxpayer or spouse is age 65 or older.',
      url: 'https://www.irs.gov/forms-pubs/about-form-1040-sr',
    },
    {
      name: 'Form 1040-X',
      status: 'unsupported',
      detail: 'Amended returns are not supported by this preview.',
      url: 'https://www.irs.gov/forms-pubs/about-form-1040-x',
    },
    {
      name: 'Schedule 1',
      status: schedule1Used ? 'partial' : 'not-applicable',
      detail: schedule1Used
        ? 'The listed adjustments are included subject to basic limits; other Schedule 1 income and adjustments are not.'
        : 'No supported Schedule 1 adjustments were entered.',
      url: 'https://www.irs.gov/forms-pubs/about-schedule-1-form-1040',
    },
    {
      name: 'Schedule 1-A',
      status: seniorDeduction > 0 ? 'partial' : 'not-applicable',
      detail:
        seniorDeduction > 0
          ? 'The enhanced senior deduction is estimated; other Schedule 1-A deductions are not included.'
          : 'No enhanced senior deduction is included.',
      url: 'https://www.irs.gov/forms-pubs/about-schedule-1-a-form-1040',
    },
    {
      name: 'Schedule B',
      status: interest > 1500 || dividends > 1500 ? 'required' : 'not-applicable',
      detail:
        interest > 1500 || dividends > 1500
          ? 'The entered interest or dividends exceed the filing threshold; supporting details are not collected.'
          : 'Generally required when taxable interest or ordinary dividends exceed $1,500.',
      url: 'https://www.irs.gov/forms-pubs/about-schedule-b-form-1040',
    },
    ...[
      ['Schedule 2', 'Additional taxes are not calculated.'],
      ['Schedule 3', 'Additional credits and payments are not calculated.'],
      ['Schedule A', 'Itemized deductions are not calculated.'],
      ['Schedule C', 'Business income and expenses are not collected.'],
      ['Schedule D', 'Capital gains and losses are not calculated.'],
      ['Schedule E', 'Rental, partnership, and pass-through income are not calculated.'],
      ['Schedule EIC', 'Earned Income Credit eligibility is not calculated.'],
      ['Schedule SE', 'Self-employment tax is not calculated.'],
      ['Schedule 8812', 'Child and other dependent credits are not calculated.'],
    ].map(([name, detail]) => ({
      name,
      status: 'unsupported',
      detail,
      url: `https://www.irs.gov/forms-pubs/about-${name.toLowerCase().replace(' ', '-')}-form-1040`,
    })),
    ...[
      ['W-2', 'https://www.irs.gov/forms-pubs/about-form-w-2', wages > 0],
      ['1099-INT', 'https://www.irs.gov/forms-pubs/about-form-1099-int', interest > 0],
      ['1099-DIV', 'https://www.irs.gov/forms-pubs/about-form-1099-div', dividends > 0],
      ['1098-E', 'https://www.irs.gov/forms-pubs/about-form-1098-e', studentLoanInterest > 0],
    ].map(([name, url, entered]) => ({
      name,
      status: entered ? 'entered' : 'not-entered',
      detail: entered ? 'Information from this form was entered.' : 'No information was entered.',
      url,
    })),
    ...[
      [
        'W-4',
        'A withholding certificate for employers; it is not filed with Form 1040 and is not collected here.',
        'https://www.irs.gov/forms-pubs/about-form-w-4',
      ],
      [
        'Other 1099 forms',
        '1099-NEC, 1099-MISC, 1099-G, 1099-R, and other income statements are not collected or calculated.',
        'https://www.irs.gov/forms-instructions',
      ],
      [
        'Other 1098 forms',
        'Mortgage-interest and tuition statements are not collected or calculated.',
        'https://www.irs.gov/forms-instructions',
      ],
      [
        '1095 series',
        'Health-coverage statements and related premium tax credits are not collected or calculated.',
        'https://www.irs.gov/forms-instructions',
      ],
    ].map(([name, detail, url]) => ({
      name,
      status: 'unsupported',
      detail,
      url,
    })),
  ];

  return {
    taxpayer: taxpayer || 'Taxpayer',
    filingStatus: filing.label,
    taxYear: 2025,
    totalIncome,
    totalAdjustments,
    agi,
    standardDeduction,
    taxableIncome,
    totalCredits: 0,
    totalTax,
    totalWithheld: withheld,
    estimatedPayments: 0,
    totalPayments,
    balance,
    effectiveRate: agi > 0 ? Math.round((totalTax / agi) * 1000) / 10 : 0,
    marginalRate,
    sections,
    forms,
    checks: [
      {
        id: 'chk-income',
        label: 'Income adds up',
        status: 'pass',
        detail: 'Income lines sum to total income.',
      },
      {
        id: 'chk-withholding',
        label: 'Withholding matches your W-2',
        status: 'pass',
        detail: 'Withholding is based on the W-2 amounts entered.',
      },
      {
        id: 'chk-adjustments',
        label: 'Adjustments need review',
        status: 'review',
        detail: 'Confirm eligibility and limits for each deduction.',
      },
      {
        id: 'chk-scope',
        label: 'Limited preview',
        status: 'review',
        detail: 'This preview does not include every tax form, credit, or eligibility rule.',
      },
    ],
    credits: [],
    deductions,
  };
}
