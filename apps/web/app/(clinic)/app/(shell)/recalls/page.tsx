import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import RecallsClient from './RecallsClient';

export default async function RecallsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  return <RecallsClient clinicId={identity.clinicId} />;
}
