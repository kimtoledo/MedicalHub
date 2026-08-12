import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import ReportsClient from './ReportsClient';
export default async function ReportsPage() { const identity = await getClinicSession(); if (!identity) redirect('/cl-login'); return <ReportsClient clinicId={identity.clinicId} role={identity.membershipRole} />; }
