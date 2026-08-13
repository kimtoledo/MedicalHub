import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import VerificationSubmissionClient from './VerificationSubmissionClient';

export default async function VerificationSettingsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  const subjectType = identity.membershipRole === 'dentist' && identity.dentistId ? 'dentist' : identity.isAdmin ? 'clinic' : null;
  if (!subjectType) redirect('/app/profile');
  return <VerificationSubmissionClient clinicId={identity.clinicId} subjectType={subjectType} />;
}
