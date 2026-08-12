import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import InventorySettingsClient from './InventorySettingsClient';

export default async function InventorySettingsPage() {
  const identity = await getClinicSession();
  if (!identity) redirect('/cl-login');
  return <InventorySettingsClient clinicId={identity.clinicId} canManage={identity.isAdmin || identity.membershipRole === 'inventory_staff'} />;
}
