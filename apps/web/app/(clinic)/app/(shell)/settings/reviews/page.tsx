import { redirect } from 'next/navigation';
import { getClinicSession } from '@/lib/clinic-session';
import ClinicReviewsClient from './ClinicReviewsClient';
export default async function ClinicReviewsPage() { const identity = await getClinicSession(); if (!identity) redirect('/cl-login'); if (!identity.isAdmin) redirect('/app/settings'); return <ClinicReviewsClient clinicId={identity.clinicId} />; }
