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
    return await db.notification.create({
      data: {
        userId,
        type,
        content,
        taskId: taskId || null,
        messageId: messageId || null,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
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
      await createNotification(
        assigneeId,
        NotificationType.TASK_ASSIGNED,
        `You have been assigned to task: ${taskTitle}`,
        taskId
      );
    } else if (assigneeRole) {
      // Notify all users with this role in the same yacht
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { yachtId: true },
      });

      if (task) {
        const users = await db.user.findMany({
          where: {
            yachtId: task.yachtId,
            role: assigneeRole,
          },
          select: { id: true },
        });

        await Promise.all(
          users.map((user) =>
            createNotification(
              user.id,
              NotificationType.TASK_ASSIGNED,
              `A new task has been assigned to ${assigneeRole} role: ${taskTitle}`,
              taskId
            )
          )
        );
      }
    }
  } catch (error) {
    console.error("Error notifying task assignment:", error);
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

