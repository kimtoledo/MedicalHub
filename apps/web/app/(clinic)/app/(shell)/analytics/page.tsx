import { redirect } from 'next/navigation';
import AppPageError from '@/components/app/AppPageError';
import { getClinicSession, getClinicShellContext } from '@/lib/clinic-session';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  if (!['clinic_owner', 'clinic_admin', 'dentist'].includes(identity.membershipRole)) return <AppPageError title="Analytics restricted" message="Clinic Owner, Admin, or Dentist access is required." kind="forbidden" />;
  const context = await getClinicShellContext(identity);
  if (!context.entitlements['reports.advanced']) return <AppPageError title="Advanced analytics unavailable" message="This clinic package does not include advanced analytics." kind="forbidden" />;
  return <AnalyticsClient clinicId={identity.clinicId} branches={context.branches} revenueVisible={['clinic_owner', 'clinic_admin'].includes(identity.membershipRole)} />;
}
