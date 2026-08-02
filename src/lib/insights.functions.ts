import { createServerFn } from "@tanstack/react-start";

import type { AdminAlert, AdminAlertFeed, AnalyticsData, CountEntry } from "./insights.server";

export type { AdminAlert, AdminAlertFeed, AnalyticsData, CountEntry };

export const getAdminAlerts = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminAlertFeed> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadAdminAlerts } = await import("./insights.server");
    await requireAdmin("view");
    return loadAdminAlerts();
  },
);

export const getAdminAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalyticsData> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadAnalytics } = await import("./insights.server");
    await requireAdmin("view");
    return loadAnalytics();
  },
);
