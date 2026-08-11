import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import InvoiceDetailClient from "./InvoiceDetailClient";

type LineItem = {
  id: string;
  description: string;
  unitPricePhp: string;
  quantity: number;
  totalPhp: string;
  toothRef: string | null;
  serviceId: string | null;
};

type Payment = {
  id: string;
  amountPhp: string;
  paymentMethod: string;
  paymentDate: string;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: "pending" | "paid" | "voided";
  totalAmountPhp: string;
  issuedAt: string | null;
  paidAt: string | null;
  patient: { id: string; firstName: string; lastName: string; patientNumber: string };
  clinic: { name: string; prefix: string; address: string | null; city: string | null; phone: string | null; logoUrl: string | null };
  lineItems: LineItem[];
  payment: Payment | null;
  encounterId: string | null;
};

export default async function InvoicePage({ params }: { params: { invoiceId: string } }) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const url = getBackendUrl(`/v1/clinic/${identity.clinicId}/invoices/${params.invoiceId}`);

  let invoice: InvoiceDetail | null = null;
  try {
    const res = await fetch(url, { headers: { cookie: cookieHeader }, cache: "no-store" });
    if (res.status === 404) notFound();
    if (!res.ok) throw new Error("Failed to load invoice");
    const body = await res.json();
    invoice = body.data;
  } catch {
    notFound();
  }

  if (!invoice) notFound();

  return <InvoiceDetailClient invoice={invoice} clinicId={identity.clinicId} />;
}
