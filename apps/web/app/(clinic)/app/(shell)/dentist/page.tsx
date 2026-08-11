import { redirect } from 'next/navigation'; import DentistDashboard from '@/components/app/dashboard/DentistDashboard'; import { getClinicSession } from '@/lib/clinic-session';
export default async function DentistDashboardPage(){const identity=await getClinicSession();if(!identity)redirect('/cl-login');return <DentistDashboard userName={identity.name}/>}
