import type { ReturnData } from './sample-return.js';

export interface InterviewAnswers {
  filingStatus: string;
  firstName: string;
  lastName: string;
  dob: string;
  ssn: string;
  spouseFirstName: string;
  spouseLastName: string;
  spouseDob: string;
  spouseSsn: string;
  spouseItemizes: string;
  hasDependents: string;
  dependentCount: string;
  hasW2: string;
  w2s: { id: string; employer: string; wages: string; withheld: string }[];
  interest: string;
  dividends: string;
  studentLoanInterest: string;
  hsa: string;
  ira: string;
}

export function calculateReturn(answers: InterviewAnswers): ReturnData;
