import { notFound, redirect } from 'next/navigation';
import { getClinicSession, getClinicShellContext } from '@/lib/clinic-session';
import OrganizationWorkspace from './OrganizationWorkspace';

export default async function OrganizationPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  const context = await getClinicShellContext(identity).catch(() => null);
  if (!context?.entitlements['organizations.manage']) notFound();
  return <OrganizationWorkspace currentClinicId={identity.clinicId} canCreate={identity.isAdmin} />;
}
