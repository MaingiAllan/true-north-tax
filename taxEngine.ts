interface TaxInput {
  w2Wages: number;
  federalWithheld: number;
  filingStatus: 'SINGLE' | 'MARRIED_JOINT';
}

interface TaxCalculationResult {
  grossIncome: number;
  standardDeduction: number;
  taxableIncome: number;
  totalTax: number;
  totalWithheld: number;
  refundOrOwed: number;
}

export function calculateTax(input: TaxInput): TaxCalculationResult {
  const { w2Wages, federalWithheld, filingStatus } = input;

  // 2025 Standard Deductions
  const STANDARD_DEDUCTION = filingStatus === 'SINGLE' ? 15750 : 31500;

  const grossIncome = w2Wages;
  const taxableIncome = Math.max(0, grossIncome - STANDARD_DEDUCTION);

  // 2025 Federal Tax Brackets for Single Filers
  let totalTax = 0;
  if (filingStatus === 'SINGLE') {
    if (taxableIncome <= 11925) {
      totalTax = taxableIncome * 0.10;
    } else if (taxableIncome <= 48475) {
      totalTax = 1192.50 + (taxableIncome - 11925) * 0.12;
    } else if (taxableIncome <= 103350) {
      totalTax = 5578.50 + (taxableIncome - 48475) * 0.22;
    } else {
      totalTax = 17651.00 + (taxableIncome - 103350) * 0.24;
    }
  }

  const refundOrOwed = federalWithheld - totalTax;

  return {
    grossIncome,
    standardDeduction: STANDARD_DEDUCTION,
    taxableIncome,
    totalTax: Math.round(totalTax * 100) / 100,
    totalWithheld: federalWithheld,
    refundOrOwed: Math.round(refundOrOwed * 100) / 100,
  };
}