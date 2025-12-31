import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

export interface DashboardStats {
  pendingTasksCount: number;
  pendingExpensesCount: number;
  reimbursableCount: number;
  lowStockCount: number;
  unreadMessagesCount: number;
}

export function useDashboardStats(): DashboardStats {
  const { data: session } = useSession();
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [reimbursableCount, setReimbursableCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Fetch pending tasks count
  useEffect(() => {
    if (!session?.user) return;

    const fetchPendingTasksCount = async () => {
      try {
        const response = await fetch("/api/tasks");
        if (response.ok) {
          const result = await response.json();
          // Handle paginated response: { data: [...], pagination: {...} }
          const tasks = Array.isArray(result) ? result : (result.data || []);

          if (!Array.isArray(tasks)) {
            console.error("Tasks response is not an array:", tasks);
            setPendingTasksCount(0);
            return;
          }

          // Get unique tasks by title + description + tripId combination
          // This ensures that if the same task is assigned to multiple people, it's counted only once
          const getUniqueTaskKey = (task: any) => {
            return `${task.title}|${task.description || ''}|${task.tripId || ''}`;
          };

          const uniqueTasks = Array.from(
            new Map(tasks.map((task: any) => [getUniqueTaskKey(task), task])).values()
          );

          const pendingCount = uniqueTasks.filter((task: any) => {
            const isAssignedToUser = task.assigneeId === session.user.id;
            const isAssignedToRole = task.assigneeRole === session.user.role;
            const isUnassigned = !task.assigneeId && !task.assigneeRole;
            const isNotCompleted = task.status !== "DONE";

            return (isAssignedToUser || isAssignedToRole || isUnassigned) && isNotCompleted;
          }).length;

          setPendingTasksCount(pendingCount);
        }
      } catch (error) {
        console.error("Error fetching pending tasks count:", error);
        setPendingTasksCount(0);
      }
    };

    fetchPendingTasksCount();
    // OPTIMIZED: Increased interval to 2 minutes to reduce bandwidth
    const interval = setInterval(fetchPendingTasksCount, 120000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // OPTIMIZED: Combined all counts into single request using count-only endpoint
  useEffect(() => {
    if (!session?.user) return;

    const fetchAllCounts = async () => {
      try {
        // Use count-only endpoint instead of fetching full lists
        const [countsRes, lowStockRes] = await Promise.all([
          fetch("/api/expenses/counts", {
            cache: "no-store",
            // Use cache from api-client if available
          }),
          hasPermission(session.user, "inventory.alcohol.view", session.user.permissions)
            ? fetch("/api/alcohol-stock/low-stock-count", { cache: "no-store" })
            : Promise.resolve({ ok: false }),
        ]);

        if (countsRes.ok) {
          const counts = await countsRes.json();
          if (hasPermission(session.user, "expenses.approve", session.user.permissions)) {
            setPendingExpensesCount(counts.pending || 0);
          }
          if (hasPermission(session.user, "expenses.view", session.user.permissions)) {
            setReimbursableCount(counts.reimbursable || 0);
          }
        } else {
          setPendingExpensesCount(0);
          setReimbursableCount(0);
        }

        if (lowStockRes.ok && "json" in lowStockRes) {
          const data = await lowStockRes.json();
          setLowStockCount(data.count || 0);
        } else {
          setLowStockCount(0);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
        setPendingExpensesCount(0);
        setReimbursableCount(0);
        setLowStockCount(0);
      }
    };

    fetchAllCounts();
    // OPTIMIZED: Single interval for all counts, increased to 2 minutes
    const interval = setInterval(fetchAllCounts, 120000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Fetch unread messages count
  useEffect(() => {
    if (!session?.user) return;

    const fetchUnreadMessagesCount = async () => {
      try {
        // First, get all accessible channels
        const channelsResponse = await fetch("/api/channels");
        if (!channelsResponse.ok) {
          setUnreadMessagesCount(0);
          return;
        }

        const channels = await channelsResponse.json();
        if (!Array.isArray(channels) || channels.length === 0) {
          setUnreadMessagesCount(0);
          return;
        }

        // Get unread counts for all channels
        const channelIds = channels.map((ch: { id: string }) => ch.id);
        const unreadResponse = await fetch("/api/messages/unread-counts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelIds }),
        });

        if (unreadResponse.ok) {
          const unreadCounts = await unreadResponse.json();
          const totalUnread = Object.values(unreadCounts).reduce(
            (sum: number, count: unknown) => sum + (typeof count === "number" ? count : 0),
            0
          );
          setUnreadMessagesCount(totalUnread);
        } else {
          setUnreadMessagesCount(0);
        }
      } catch (error) {
        console.error("Error fetching unread messages count:", error);
        setUnreadMessagesCount(0);
      }
    };

    fetchUnreadMessagesCount();
    // Poll every 2 minutes (same as other counts)
    const interval = setInterval(fetchUnreadMessagesCount, 120000);
    return () => clearInterval(interval);
  }, [session?.user]);

  return {
    pendingTasksCount,
    pendingExpensesCount,
    reimbursableCount,
    lowStockCount,
    unreadMessagesCount,
  };
}

