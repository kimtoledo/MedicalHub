import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import OrganizationWorkspace from './OrganizationWorkspace';

export default async function OrganizationPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  return <OrganizationWorkspace currentClinicId={identity.clinicId} canCreate={identity.isAdmin} />;
}
