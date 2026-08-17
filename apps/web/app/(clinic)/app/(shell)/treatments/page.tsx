import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import TreatmentsListClient from './TreatmentsListClient';

export default async function TreatmentsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  return <TreatmentsListClient dentist={identity.role === 'dentist'} />;
}
