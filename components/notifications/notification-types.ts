export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_COMPLETED"
  | "TASK_DUE_SOON"
  | "TASK_OVERDUE"
  | "MESSAGE_MENTION"
  | "MESSAGE_RECEIVED"
  | "SHOPPING_LIST_COMPLETED";

export interface DashboardNotification {
  id: string;
  type: NotificationType;
  content: string;
  read: boolean;
  createdAt: string;
  link?: string | null;
  task: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  } | null;
  message: {
    id: string;
    channelId: string;
    content: string | null;
    channel: {
      id: string;
      name: string;
    };
  } | null;
}

export const NOTIFICATION_BADGE_META: Record<
  NotificationType,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  TASK_ASSIGNED: { label: "Assigned", variant: "default" },
  TASK_COMPLETED: { label: "Completed", variant: "secondary" },
  TASK_DUE_SOON: { label: "Due Soon", variant: "outline" },
  TASK_OVERDUE: { label: "Overdue", variant: "destructive" },
  MESSAGE_MENTION: { label: "Mention", variant: "default" },
  MESSAGE_RECEIVED: { label: "Message", variant: "secondary" },
  SHOPPING_LIST_COMPLETED: { label: "Procurement", variant: "secondary" },
};


