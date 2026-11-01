import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReturn } from '../src/lib/return-calculator.mjs';

function interview(overrides = {}) {
  return {
    filingStatus: 'single',
    firstName: 'Alex',
    lastName: 'Taxpayer',
    dob: '1990-01-01',
    ssn: '123-45-6789',
    spouseFirstName: '',
    spouseLastName: '',
    spouseDob: '',
    spouseSsn: '',
    spouseItemizes: 'no',
    hasDependents: 'no',
    dependentCount: '',
    hasW2: 'yes',
    w2s: [{ id: 'w2-1', employer: 'Example', wages: '75000', withheld: '0' }],
    interest: '',
    dividends: '',
    studentLoanInterest: '',
    hsa: '',
    ira: '',
    ...overrides,
  };
}

test('calculates 2025 Single deduction and bracket tax', () => {
  const result = calculateReturn(interview());
  assert.equal(result.standardDeduction, 15750);
  assert.equal(result.taxableIncome, 59250);
  assert.equal(result.totalTax, 7955);
  assert.equal(result.filingStatus, 'Single');
});

test('uses joint standard deduction and brackets for Married Filing Jointly', () => {
  const result = calculateReturn(
    interview({
      filingStatus: 'mfj',
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '100000', withheld: '0' }],
    })
  );
  assert.equal(result.standardDeduction, 31500);
  assert.equal(result.taxableIncome, 68500);
  assert.equal(result.totalTax, 7746);
});

test('uses Head of Household standard deduction and brackets', () => {
  const result = calculateReturn(
    interview({
      filingStatus: 'hoh',
      hasDependents: 'yes',
      dependentCount: '1',
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '50000', withheld: '0' }],
    })
  );
  assert.equal(result.standardDeduction, 23625);
  assert.equal(result.taxableIncome, 26375);
  assert.equal(result.totalTax, 2825);
});

test('uses the Qualifying Surviving Spouse standard deduction and brackets', () => {
  const result = calculateReturn(
    interview({
      filingStatus: 'qss',
      hasDependents: 'yes',
      dependentCount: '1',
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '50000', withheld: '0' }],
    })
  );
  assert.equal(result.standardDeduction, 31500);
  assert.equal(result.taxableIncome, 18500);
  assert.equal(result.filingStatus, 'Qualifying surviving spouse');
});

test('omits the MFS standard deduction when the spouse itemizes', () => {
  const result = calculateReturn(
    interview({
      filingStatus: 'mfs',
      spouseItemizes: 'yes',
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '50000', withheld: '0' }],
    })
  );
  assert.equal(result.standardDeduction, 0);
  assert.equal(result.taxableIncome, 50000);
});

test('uses the single-filer tax brackets for a Married Filing Separately return', () => {
  const result = calculateReturn(
    interview({
      filingStatus: 'mfs',
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '75000', withheld: '0' }],
    })
  );
  assert.equal(result.taxableIncome, 59250);
  assert.equal(result.totalTax, 7955);
});

test('applies the 2025 age and enhanced senior deductions', () => {
  const result = calculateReturn(
    interview({
      dob: '1961-01-01',
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '80000', withheld: '0' }],
    })
  );
  assert.equal(result.standardDeduction, 17750);
  assert.equal(result.taxableIncome, 56550);
  assert.equal(result.deductions.find((deduction) => deduction.id === 'ded-senior')?.amount, 5700);
  assert.equal(result.forms.find((form) => form.name === 'Schedule 1-A')?.status, 'partial');
});

test('applies one senior deduction per eligible spouse on a joint return', () => {
  const result = calculateReturn(
    interview({
      filingStatus: 'mfj',
      dob: '1961-01-01',
      spouseDob: '1960-06-01',
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '100000', withheld: '0' }],
    })
  );
  assert.equal(result.standardDeduction, 34700);
  assert.equal(result.taxableIncome, 53300);
  assert.equal(result.deductions.find((deduction) => deduction.id === 'ded-senior')?.amount, 12000);
});

test('phases out student loan interest and identifies Schedule B threshold', () => {
  const result = calculateReturn(
    interview({
      w2s: [{ id: 'w2-1', employer: 'Example', wages: '90000', withheld: '0' }],
      studentLoanInterest: '2500',
      interest: '1600',
    })
  );
  assert.equal(result.totalAdjustments, 1400);
  assert.equal(result.forms.find((form) => form.name === 'Schedule B')?.status, 'required');
});
