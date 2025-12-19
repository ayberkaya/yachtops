import "server-only";
import { db } from "@/lib/db";
import { NotificationType, UserRole } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  content: string,
  taskId?: string,
  messageId?: string
) {
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        content,
        taskId: taskId || null,
        messageId: messageId || null,
      },
    });

    // Send push notification if user has subscription
    sendPushNotification(userId, {
      title: getNotificationTitle(type),
      body: content,
      tag: notification.id,
      data: {
        url: getNotificationUrl(type, taskId, messageId),
        notificationId: notification.id,
      },
      requireInteraction: type === "TASK_ASSIGNED" || type === "MESSAGE_MENTION",
    }).catch((error) => {
      console.error("Error sending push notification:", error);
      // Don't fail if push notification fails
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
  }
) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true },
    });

    if (!user?.pushSubscription) {
      return; // User doesn't have push subscription
    }

    const subscription = JSON.parse(user.pushSubscription);

    // Dynamically import web-push to avoid issues if not installed
    let webpush: typeof import("web-push");
    try {
      webpush = await import("web-push");
    } catch (error) {
      console.warn("web-push is not installed. Install it with: npm install web-push");
      return;
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@helmops.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("VAPID keys are not configured. Push notifications will not work.");
      return;
    }

    // Set VAPID details (only need to do this once, but it's safe to do multiple times)
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    // Send push notification
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    // If subscription is invalid, remove it from database
    if (error instanceof Error && error.message.includes("410")) {
      await db.user.update({
        where: { id: userId },
        data: { pushSubscription: null },
      });
    }
    throw error;
  }
}

function getNotificationTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    TASK_ASSIGNED: "New Task Assigned",
    TASK_COMPLETED: "Task Completed",
    TASK_DUE_SOON: "Task Due Soon",
    TASK_OVERDUE: "Task Overdue",
    MESSAGE_MENTION: "You Were Mentioned",
    MESSAGE_RECEIVED: "New Message",
    SHOPPING_LIST_COMPLETED: "Shopping List Completed",
  };
  return titles[type] || "HelmOps Notification";
}

function getNotificationUrl(
  type: NotificationType,
  taskId?: string,
  messageId?: string
): string {
  if (taskId) {
    return `/dashboard/tasks/${taskId}`;
  }
  if (messageId) {
    return `/dashboard/messages`;
  }
  return "/dashboard";
}

export async function notifyTaskAssignment(
  taskId: string,
  assigneeId: string | null,
  assigneeRole: UserRole | null,
  taskTitle: string
) {
  try {
    if (assigneeId) {
      // Notify specific user
      console.log(`Notifying user ${assigneeId} about task assignment: ${taskTitle}`);
      const notification = await createNotification(
        assigneeId,
        NotificationType.TASK_ASSIGNED,
        `You have been assigned to task: ${taskTitle}`,
        taskId
      );
      if (notification) {
        console.log(`Notification created successfully for user ${assigneeId}`);
      } else {
        console.warn(`Failed to create notification for user ${assigneeId}`);
      }
    } else if (assigneeRole) {
      // Notify all users with this role in the same yacht
      console.log(`Notifying all users with role ${assigneeRole} about task assignment: ${taskTitle}`);
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { yachtId: true },
      });

      if (task) {
        const users = await db.user.findMany({
          where: {
            yachtId: task.yachtId,
            role: assigneeRole,
            active: true, // Only notify active users
          },
          select: { id: true },
        });

        console.log(`Found ${users.length} users with role ${assigneeRole} to notify`);

        if (users.length > 0) {
          const results = await Promise.allSettled(
            users.map((user: { id: string }) =>
              createNotification(
                user.id,
                NotificationType.TASK_ASSIGNED,
                `A new task has been assigned to ${assigneeRole} role: ${taskTitle}`,
                taskId
              )
            )
          );

          const successful = results.filter((r) => r.status === "fulfilled" && r.value !== null).length;
          const failed = results.filter((r) => r.status === "rejected" || r.value === null).length;
          console.log(`Task assignment notifications: ${successful} successful, ${failed} failed`);
        } else {
          console.warn(`No active users found with role ${assigneeRole} in yacht ${task.yachtId}`);
        }
      } else {
        console.error(`Task ${taskId} not found when trying to send role-based notification`);
      }
    } else {
      console.log(`Task ${taskId} has no assignee or role, skipping notification`);
    }
  } catch (error) {
    console.error("Error notifying task assignment:", error);
    // Re-throw to allow caller to handle if needed
    throw error;
  }
}

export async function notifyTaskCompletion(
  taskId: string,
  taskTitle: string,
  completedBy: { id: string; name: string | null; email: string }
) {
  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        yachtId: true,
        assignee: {
          select: { id: true },
        },
      },
    });

    if (!task) return;

    const completedByName = completedBy.name || completedBy.email;

    // Notify task assignee (if different from completer)
    if (task.assignee && task.assignee.id !== completedBy.id) {
      await createNotification(
        task.assignee.id,
        NotificationType.TASK_COMPLETED,
        `Task "${taskTitle}" has been completed by ${completedByName}`,
        taskId
      );
    }

    // Notify OWNER/CAPTAIN
    const ownersAndCaptains = await db.user.findMany({
      where: {
        yachtId: task.yachtId,
        role: { in: ["OWNER", "CAPTAIN"] },
      },
      select: { id: true },
    });

    for (const user of ownersAndCaptains) {
      if (user.id !== completedBy.id) {
        await createNotification(
          user.id,
          NotificationType.TASK_COMPLETED,
          `Task "${taskTitle}" has been completed by ${completedByName}`,
          taskId
        );
      }
    }
  } catch (error) {
    console.error("Error notifying task completion:", error);
  }
}

export async function checkDueDates() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Find tasks due in the next 24 hours
    const tasksDueSoon = await db.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: {
          gte: now,
          lte: tomorrow,
        },
      },
      select: {
        id: true,
        title: true,
        yachtId: true,
        assignee: {
          select: { id: true },
        },
      },
    });

    for (const task of tasksDueSoon) {
      // Check if notification already exists
      const existingNotification = await db.notification.findFirst({
        where: {
          taskId: task.id,
          type: NotificationType.TASK_DUE_SOON,
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (!existingNotification) {
        // Notify assignee
        if (task.assignee) {
          await createNotification(
            task.assignee.id,
            NotificationType.TASK_DUE_SOON,
            `Task "${task.title}" is due soon`,
            task.id
          );
        }

        // Notify OWNER/CAPTAIN
        const ownersAndCaptains = await db.user.findMany({
          where: {
            yachtId: task.yachtId,
            role: { in: ["OWNER", "CAPTAIN"] },
          },
          select: { id: true },
        });

        for (const user of ownersAndCaptains) {
          await createNotification(
            user.id,
            NotificationType.TASK_DUE_SOON,
            `Task "${task.title}" is due soon`,
            task.id
          );
        }
      }
    }

    // Find overdue tasks
    const overdueTasks = await db.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: {
          lt: now,
        },
      },
      select: {
        id: true,
        title: true,
        yachtId: true,
        assignee: {
          select: { id: true },
        },
      },
    });

    for (const task of overdueTasks) {
      // Check if notification already exists (only once per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingNotification = await db.notification.findFirst({
        where: {
          taskId: task.id,
          type: NotificationType.TASK_OVERDUE,
          createdAt: {
            gte: today,
          },
        },
      });

      if (!existingNotification) {
        // Notify assignee
        if (task.assignee) {
          await createNotification(
            task.assignee.id,
            NotificationType.TASK_OVERDUE,
            `Task "${task.title}" is overdue`,
            task.id
          );
        }

        // Notify OWNER/CAPTAIN
        const ownersAndCaptains = await db.user.findMany({
          where: {
            yachtId: task.yachtId,
            role: { in: ["OWNER", "CAPTAIN"] },
          },
          select: { id: true },
        });

        for (const user of ownersAndCaptains) {
          await createNotification(
            user.id,
            NotificationType.TASK_OVERDUE,
            `Task "${task.title}" is overdue`,
            task.id
          );
        }
      }
    }
  } catch (error) {
    console.error("Error checking due dates:", error);
  }
}

