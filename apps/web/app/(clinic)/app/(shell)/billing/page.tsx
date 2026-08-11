import { Receipt, Plus, Search, Filter, CalendarRange } from "lucide-react";
import Link from "next/link";
import { getClinicSession } from "@/lib/clinic-session";
import { getBackendUrl } from "@/lib/backend";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: "pending" | "paid" | "voided";
  totalAmountPhp: string;
  issuedAt: string | null;
  paidAt: string | null;
  patient: { id: string; firstName: string; lastName: string; patientNumber: string };
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid:    "bg-emerald-100 text-emerald-700",
  voided:  "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid:    "Paid",
  voided:  "Voided",
};

function formatPhp(amount: string) {
  return `₱${parseFloat(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

async function fetchInvoices(
  clinicId: string,
  cookieHeader: string,
  params: { search?: string; status?: string; dateFrom?: string; dateTo?: string; page?: string },
) {
  const url = getBackendUrl(`/v1/clinic/${clinicId}/invoices`);
  if (params.search)   url.searchParams.set("search",   params.search);
  if (params.status)   url.searchParams.set("status",   params.status);
  if (params.dateFrom) url.searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo)   url.searchParams.set("dateTo",   params.dateTo);
  if (params.page)     url.searchParams.set("page",     params.page);
  url.searchParams.set("pageSize", "20");

  try {
    const res = await fetch(url, { headers: { cookie: cookieHeader }, cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<{ success: true; data: InvoiceListItem[]; total: number; page: number; pageSize: number }>;
  } catch {
    return null;
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; dateFrom?: string; dateTo?: string; page?: string };
}) {
  const identity = await getClinicSession();
  if (!identity) redirect("/cl-login");

  const cookieHeader = cookies().toString();
  const result = await fetchInvoices(identity.clinicId, cookieHeader, searchParams);
  const invoices = result?.data ?? [];
  const total = result?.total ?? 0;
  const page = result?.page ?? 1;
  const pageSize = result?.pageSize ?? 20;
  const totalPages = Math.ceil(total / pageSize);

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    { value: "voided", label: "Voided" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Billing</h1>
          <p className="text-violet-500 text-sm mt-0.5">Invoices and payments</p>
        </div>
        <Link
          href="/app/billing/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> Generate Invoice
        </Link>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
            <input
              name="search"
              defaultValue={searchParams.search ?? ""}
              placeholder="Search patient or invoice #…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-violet-200 bg-white text-sm text-violet-900 placeholder:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
            <select
              name="status"
              defaultValue={searchParams.status ?? ""}
              className="pl-8 pr-10 py-2.5 rounded-xl border border-violet-200 bg-white text-sm text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none"
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Date range row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 flex items-center gap-2">
            <CalendarRange size={14} className="flex-shrink-0 text-violet-400" />
            <div className="flex flex-1 items-center gap-2">
              <input
                type="date"
                name="dateFrom"
                defaultValue={searchParams.dateFrom ?? ""}
                className="flex-1 px-3 py-2 rounded-xl border border-violet-200 bg-white text-sm text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span className="text-violet-400 text-sm">to</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={searchParams.dateTo ?? ""}
                className="flex-1 px-3 py-2 rounded-xl border border-violet-200 bg-white text-sm text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Apply Filters
          </button>
          {(searchParams.search || searchParams.status || searchParams.dateFrom || searchParams.dateTo) && (
            <Link
              href="/app/billing"
              className="px-4 py-2.5 border border-violet-200 text-violet-600 hover:bg-violet-50 text-sm font-semibold rounded-xl transition-colors text-center"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Invoice table */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Receipt size={40} className="text-violet-200" />
            <p className="text-violet-400 text-sm font-medium">No invoices found</p>
            <p className="text-violet-300 text-xs">
              {(searchParams.search || searchParams.status || searchParams.dateFrom || searchParams.dateTo)
                ? "Try adjusting your filters"
                : "Invoices are generated from finalized encounters"}
            </p>
            <Link href="/app/billing/new" className="text-violet-500 hover:text-violet-700 text-sm font-semibold">
              Generate your first invoice →
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-violet-500 font-semibold border-b border-violet-50">
                    <th className="px-5 py-3 text-left">Invoice #</th>
                    <th className="px-5 py-3 text-left">Patient</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-violet-50/40 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-violet-700 font-semibold">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-violet-900">{inv.patient.firstName} {inv.patient.lastName}</p>
                        <p className="text-xs text-violet-400">{inv.patient.patientNumber}</p>
                      </td>
                      <td className="px-5 py-3 text-violet-600 text-xs">{formatDate(inv.issuedAt)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-violet-900">{formatPhp(inv.totalAmountPhp)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[inv.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/app/billing/${inv.id}`}
                          className="text-violet-500 hover:text-violet-700 text-xs font-semibold"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-violet-50">
              {invoices.map((inv) => (
                <Link key={inv.id} href={`/app/billing/${inv.id}`} className="block p-4 hover:bg-violet-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-violet-900 text-sm truncate">
                        {inv.patient.firstName} {inv.patient.lastName}
                      </p>
                      <p className="font-mono text-xs text-violet-400 mt-0.5">{inv.invoiceNumber}</p>
                      <p className="text-xs text-violet-500 mt-1">{formatDate(inv.issuedAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-violet-900 text-sm">{formatPhp(inv.totalAmountPhp)}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[inv.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-violet-50">
                <p className="text-xs text-violet-400">{total} total invoices</p>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                        p === page
                          ? "bg-violet-600 text-white"
                          : "text-violet-500 hover:bg-violet-50"
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
