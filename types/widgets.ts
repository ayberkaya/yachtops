/**
 * Widget system types and interfaces
 */

export type WidgetType =
  | "cash_ledger_summary"
  | "credit_card_expenses"
  | "pending_expenses"
  | "recent_expenses"
  | "my_tasks"
  | "role_tasks_alert"
  | "upcoming_maintenance"
  | "expiring_permissions"
  | "low_stock_alert"
  | "quick_stats"
  | "calendar_events";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface WidgetConfig {
  id: WidgetType;
  enabled: boolean;
  order: number;
  size?: WidgetSize;
  position?: {
    row: number;
    col: number;
  };
}

export interface DashboardWidgets {
  widgets: WidgetConfig[];
  layout?: "grid" | "list";
  lastUpdated?: string;
}

export const DEFAULT_WIDGETS: Record<UserRoleType, WidgetConfig[]> = {
  OWNER: [
    { id: "cash_ledger_summary", enabled: true, order: 0, size: "medium" },
    { id: "credit_card_expenses", enabled: true, order: 1, size: "medium" },
    { id: "role_tasks_alert", enabled: true, order: 2, size: "full" },
    { id: "upcoming_maintenance", enabled: true, order: 3, size: "full" },
    { id: "expiring_permissions", enabled: true, order: 4, size: "full" },
    { id: "quick_stats", enabled: true, order: 5, size: "medium" },
    { id: "pending_expenses", enabled: true, order: 6, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 7, size: "medium" },
    { id: "calendar_events", enabled: true, order: 8, size: "medium" },
  ],
  CAPTAIN: [
    { id: "cash_ledger_summary", enabled: true, order: 0, size: "medium" },
    { id: "credit_card_expenses", enabled: true, order: 1, size: "medium" },
    { id: "role_tasks_alert", enabled: true, order: 2, size: "full" },
    { id: "upcoming_maintenance", enabled: true, order: 3, size: "full" },
    { id: "expiring_permissions", enabled: true, order: 4, size: "full" },
    { id: "quick_stats", enabled: true, order: 5, size: "medium" },
    { id: "pending_expenses", enabled: true, order: 6, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 7, size: "medium" },
    { id: "calendar_events", enabled: true, order: 8, size: "medium" },
  ],
  CREW: [
    { id: "my_tasks", enabled: true, order: 0, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 1, size: "medium" },
    { id: "calendar_events", enabled: true, order: 2, size: "medium" },
    { id: "upcoming_maintenance", enabled: true, order: 4, size: "full" },
  ],
  CHEF: [
    { id: "my_tasks", enabled: true, order: 0, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 1, size: "medium" },
    { id: "calendar_events", enabled: true, order: 2, size: "medium" },
    { id: "low_stock_alert", enabled: true, order: 4, size: "full" },
  ],
  STEWARDESS: [
    { id: "my_tasks", enabled: true, order: 0, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 1, size: "medium" },
    { id: "calendar_events", enabled: true, order: 2, size: "medium" },
    { id: "low_stock_alert", enabled: true, order: 4, size: "full" },
  ],
  DECKHAND: [
    { id: "my_tasks", enabled: true, order: 0, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 1, size: "medium" },
    { id: "calendar_events", enabled: true, order: 2, size: "medium" },
    { id: "upcoming_maintenance", enabled: true, order: 4, size: "full" },
  ],
  ENGINEER: [
    { id: "my_tasks", enabled: true, order: 0, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 1, size: "medium" },
    { id: "calendar_events", enabled: true, order: 2, size: "medium" },
    { id: "upcoming_maintenance", enabled: true, order: 4, size: "full" },
  ],
  ADMIN: [
    { id: "role_tasks_alert", enabled: true, order: 0, size: "full" },
    { id: "quick_stats", enabled: true, order: 1, size: "medium" },
    { id: "pending_expenses", enabled: true, order: 2, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 3, size: "medium" },
  ],
  SUPER_ADMIN: [
    { id: "quick_stats", enabled: true, order: 0, size: "medium" },
    { id: "pending_expenses", enabled: true, order: 1, size: "medium" },
    { id: "recent_expenses", enabled: true, order: 2, size: "medium" },
  ],
};

import { UserRole } from "@prisma/client";

export type UserRoleType = UserRole;

