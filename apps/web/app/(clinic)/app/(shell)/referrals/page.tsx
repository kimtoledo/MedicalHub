import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import ReferralsClient from './ReferralsClient';

export default async function ReferralsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  return <ReferralsClient clinicId={identity.clinicId} />;
}
