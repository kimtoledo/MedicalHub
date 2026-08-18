import type { DashboardAppointment } from "@/components/app/dashboard/types";

export type TodayQueueKey =
  | "waiting"
  | "inTreatment"
  | "upcoming"
  | "completed"
  | "closed";

export const todayQueueOrder: TodayQueueKey[] = [
  "waiting",
  "inTreatment",
  "upcoming",
  "completed",
  "closed",
];

export function todayQueueForStatus(status: string): TodayQueueKey {
  if (status === "checked_in") return "waiting";
  if (status === "in_progress") return "inTreatment";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "no_show") return "closed";
  return "upcoming";
}

export function groupTodayAppointments(rows: DashboardAppointment[]) {
  const grouped: Record<TodayQueueKey, DashboardAppointment[]> = {
    waiting: [],
    inTreatment: [],
    upcoming: [],
    completed: [],
    closed: [],
  };

  for (const row of rows) grouped[todayQueueForStatus(row.status)].push(row);
  return grouped;
}

export function todayAppointmentLinkLabel(status: string) {
  if (status === "in_progress") return "Continue visit";
  if (status === "completed") return "Review & bill";
  if (status === "cancelled" || status === "no_show") return "Review";
  return "Open visit";
}
