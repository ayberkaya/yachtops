"server-only";

import webpush from "web-push";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { UserRole, NotificationType } from "@prisma/client";
import { createHash } from "crypto";

/**
 * Notification payload structure
 */
export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Initialize web-push with VAPID keys from environment variables
 * This should be called once at module load time
 */
function initializeWebPush(): void {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@helmops.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn(
      "⚠️ VAPID keys are not configured. Push notifications will not work."
    );
    console.warn(
      "   Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL in your environment variables."
    );
    return;
  }

  // Set VAPID details (safe to call multiple times)
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

// Initialize on module load
initializeWebPush();

/**
 * Convert NextAuth user ID to Supabase UUID format
 * This matches the conversion used in supabase-auth-sync.ts
 */
function getUuidFromUserId(userId: string): string {
  // If already UUID format, return as is
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) {
    return userId;
  }

  // Convert to UUID format using SHA-1 hash
  const hash = createHash("sha1").update(userId).digest("hex");
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "5" + hash.substring(13, 16),
    "8" + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join("-");
}

/**
 * Send push notification to a specific user
 * 
 * @param userId - NextAuth user ID (will be converted to Supabase UUID)
 * @param payload - Notification payload with title, body, url, etc.
 * @returns Promise that resolves to the number of successful notifications sent
 */
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
): Promise<number> {
  try {
    const supabase = await createClient();
    const supabaseUserId = getUuidFromUserId(userId);

    // Fetch all push subscriptions for this user from Supabase
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", supabaseUserId);

    if (error) {
      console.error(
        `Error fetching push subscriptions for user ${userId}:`,
        error
      );
      return 0;
    }

    if (!subscriptions || subscriptions.length === 0) {
      // User has no push subscriptions - this is not an error
      return 0;
    }

    // Prepare notification payload for web-push
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      vibrate: payload.vibrate,
      actions: payload.actions,
    });

    // Send notification to all subscriptions for this user
    let successCount = 0;
    const deletePromises: Promise<void>[] = [];

    for (const subscription of subscriptions) {
      try {
        // Reconstruct PushSubscription object
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        // Send notification
        await webpush.sendNotification(
          pushSubscription,
          notificationPayload
        );
        successCount++;
      } catch (error: any) {
        // Handle 410 (Gone) errors - subscription is invalid
        if (error?.statusCode === 410 || error?.message?.includes("410")) {
          console.log(
            `Subscription ${subscription.id} is invalid (410 Gone), deleting...`
          );
          // Delete invalid subscription from database
          const deletePromise = supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          
          deletePromises.push(
            Promise.resolve(deletePromise)
              .then(() => {
                console.log(`Deleted invalid subscription ${subscription.id}`);
              })
              .catch((deleteError: unknown) => {
                console.error(
                  `Error deleting invalid subscription ${subscription.id}:`,
                  deleteError
                );
              })
          );
        } else {
          // Other errors - log but don't delete subscription
          console.error(
            `Error sending notification to subscription ${subscription.id}:`,
            error
          );
        }
      }
    }

    // Wait for all deletions to complete (don't block on errors)
    await Promise.allSettled(deletePromises);

    return successCount;
  } catch (error) {
    console.error(`Error in sendNotificationToUser for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Send push notification to all users with a specific role
 * 
 * @param role - UserRole enum value (e.g., 'CREW', 'CAPTAIN', 'OWNER')
 * @param payload - Notification payload with title, body, url, etc.
 * @param yachtId - Optional yacht ID to filter users by yacht (tenant isolation)
 * @returns Promise that resolves to the total number of successful notifications sent
 */
export async function sendNotificationToRole(
  role: UserRole,
  payload: NotificationPayload,
  yachtId?: string
): Promise<number> {
  try {
    // Query users with the specified role
    const whereClause: any = {
      role,
      active: true, // Only notify active users
    };

    // If yachtId is provided, filter by yacht (tenant isolation)
    if (yachtId) {
      whereClause.yachtId = yachtId;
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (users.length === 0) {
      console.log(`No active users found with role ${role}`);
      return 0;
    }

    console.log(
      `Sending notification to ${users.length} users with role ${role}`
    );

    // Send notification to each user
    const results = await Promise.allSettled(
      users.map((user: { id: string }) => sendNotificationToUser(user.id, payload))
    );

    // Count successful notifications
    const successCount = results.reduce((count, result) => {
      if (result.status === "fulfilled") {
        return count + result.value;
      } else {
        console.error("Error sending notification to user:", result.reason);
        return count;
      }
    }, 0);

    console.log(
      `Sent ${successCount} notifications to users with role ${role}`
    );

    return successCount;
  } catch (error) {
    console.error(`Error in sendNotificationToRole for role ${role}:`, error);
    return 0;
  }
}

/**
 * Send push notification to all users in a channel (excluding the sender)
 * 
 * @param channelId - MessageChannel ID
 * @param excludeUserId - User ID to exclude from notifications (usually the sender)
 * @param payload - Notification payload with title, body, url, etc.
 * @returns Promise that resolves to the total number of successful notifications sent
 */
export async function sendNotificationToChannel(
  channelId: string,
  excludeUserId: string,
  payload: NotificationPayload
): Promise<number> {
  try {
    // Query channel with members
    const channel = await db.messageChannel.findUnique({
      where: { id: channelId },
      select: {
        members: {
          select: { id: true },
        },
      },
    });

    if (!channel) {
      console.error(`Channel ${channelId} not found`);
      return 0;
    }

    // Filter out the excluded user (sender)
    const recipientIds = channel.members
      .map((member: { id: string }) => member.id)
      .filter((id: string) => id !== excludeUserId);

    if (recipientIds.length === 0) {
      console.log(
        `No recipients found for channel ${channelId} (excluding sender ${excludeUserId})`
      );
      return 0;
    }

    console.log(
      `Sending notification to ${recipientIds.length} users in channel ${channelId}`
    );

    // Send notification to each recipient
    const results = await Promise.allSettled(
      recipientIds.map((userId: string) => sendNotificationToUser(userId, payload))
    );

    // Count successful notifications
    const successCount = results.reduce((count, result) => {
      if (result.status === "fulfilled") {
        return count + result.value;
      } else {
        console.error("Error sending notification to user:", result.reason);
        return count;
      }
    }, 0);

    console.log(
      `Sent ${successCount} notifications to users in channel ${channelId}`
    );

    return successCount;
  } catch (error) {
    console.error(
      `Error in sendNotificationToChannel for channel ${channelId}:`,
      error
    );
    return 0;
  }
}

// ============================================================================
// Legacy Functions (for backward compatibility)
// These functions create database notifications AND send push notifications
// ============================================================================

/**
 * Create a database notification and send push notification
 * This is a legacy function kept for backward compatibility
 * 
 * @param userId - User ID to notify
 * @param type - Notification type
 * @param content - Notification content
 * @param taskId - Optional task ID
 * @param messageId - Optional message ID
 * @returns Created notification or null on error
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  content: string,
  taskId?: string,
  messageId?: string
) {
  try {
    // Create database notification
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        content,
        taskId: taskId || null,
        messageId: messageId || null,
      },
    });

    // Send push notification using the new centralized service
    const pushBody =
      type === "MESSAGE_RECEIVED" ? "Yeni mesaj aldınız" : content;

    await sendNotificationToUser(userId, {
      title: getNotificationTitle(type),
      body: pushBody,
      url: getNotificationUrl(type, taskId, messageId),
      tag: notification.id,
      requireInteraction:
        type === "TASK_ASSIGNED" || type === "MESSAGE_MENTION",
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

/**
 * Notify task assignment (legacy function)
 */
export async function notifyTaskAssignment(
  taskId: string,
  assigneeId: string | null,
  assigneeRole: UserRole | null,
  taskTitle: string
) {
  try {
    if (assigneeId) {
      // Notify specific user
      await createNotification(
        assigneeId,
        NotificationType.TASK_ASSIGNED,
        `You have been assigned to task: ${taskTitle}`,
        taskId
      );
    } else if (assigneeRole) {
      // Notify all users with this role
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { yachtId: true },
      });

      if (task) {
        await sendNotificationToRole(
          assigneeRole,
          {
            title: "New Task Assigned",
            body: `A new task has been assigned to ${assigneeRole} role: ${taskTitle}`,
            url: `/dashboard/tasks/${taskId}`,
            tag: taskId,
            requireInteraction: true,
          },
          task.yachtId
        );
      }
    }
  } catch (error) {
    console.error("Error notifying task assignment:", error);
    throw error;
  }
}

/**
 * Notify task completion (legacy function)
 */
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
    await sendNotificationToRole(
      UserRole.OWNER,
      {
        title: "Task Completed",
        body: `Task "${taskTitle}" has been completed by ${completedByName}`,
        url: `/dashboard/tasks/${taskId}`,
        tag: taskId,
      },
      task.yachtId
    );

    await sendNotificationToRole(
      UserRole.CAPTAIN,
      {
        title: "Task Completed",
        body: `Task "${taskTitle}" has been completed by ${completedByName}`,
        url: `/dashboard/tasks/${taskId}`,
        tag: taskId,
      },
      task.yachtId
    );
  } catch (error) {
    console.error("Error notifying task completion:", error);
  }
}

/**
 * Check due dates and send notifications (legacy function)
 */
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
      const existingNotification = await db.notification.findFirst({
        where: {
          taskId: task.id,
          type: NotificationType.TASK_DUE_SOON,
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existingNotification && task.assignee) {
        await createNotification(
          task.assignee.id,
          NotificationType.TASK_DUE_SOON,
          `Task "${task.title}" is due soon`,
          task.id
        );
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

      if (!existingNotification && task.assignee) {
        await createNotification(
          task.assignee.id,
          NotificationType.TASK_OVERDUE,
          `Task "${task.title}" is overdue`,
          task.id
        );
      }
    }
  } catch (error) {
    console.error("Error checking due dates:", error);
  }
}

// Helper functions for notification formatting
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
