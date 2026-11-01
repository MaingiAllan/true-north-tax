import type { Metadata } from 'next';
import InterviewShell from './components/InterviewShell';

export const metadata: Metadata = {
  title: 'Tax interview',
};

export default function TaxInterviewPage() {
  return <InterviewShell />;
}
