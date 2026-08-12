import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import SubscriptionClient from './SubscriptionClient';
export default async function SubscriptionPage() { const identity = await getClinicSession(); if (!identity) redirect('/cl-login'); return <SubscriptionClient clinicId={identity.clinicId} />; }
