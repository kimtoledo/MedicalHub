import { describe, expect, it, vi } from "vitest";
import type { DB } from "@dentra/db";
import { appointments } from "@dentra/db/schema";
import { createClinicDashboardService } from "../src/clinic/dashboard-service.js";

describe("clinic dashboard service", () => {
  it("locks only the appointment row when loading quick-completion context", async () => {
    const lock = vi.fn(async () => []);
    const query = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      for: lock,
    };
    const transaction = { select: vi.fn(() => query) };
    const database = {
      transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    } as unknown as DB;
    const service = createClinicDashboardService(database);

    await expect(
      service.completeQuickService(
        "00000000-0000-0000-0000-000000000101",
        "00000000-0000-0000-0000-000000000501",
        {},
        { id: "user", email: "staff@test" },
      ),
    ).rejects.toMatchObject({
      code: "APPOINTMENT_NOT_FOUND",
      statusCode: 404,
    });

    expect(lock).toHaveBeenCalledWith("update", { of: appointments });
  });
});
