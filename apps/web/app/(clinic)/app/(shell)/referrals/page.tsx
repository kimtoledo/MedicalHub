import { notFound, redirect } from 'next/navigation';
import { getClinicSession, getClinicShellContext } from '@/lib/clinic-session';
import ReferralsClient from './ReferralsClient';

export default async function ReferralsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  const context = await getClinicShellContext(identity).catch(() => null);
  if (!context?.entitlements['patients.referrals']) notFound();
  return <ReferralsClient clinicId={identity.clinicId} />;
}
