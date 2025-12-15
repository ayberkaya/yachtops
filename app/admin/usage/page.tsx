import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays } from "date-fns";

export default async function UsageInsightsPage() {
  const session = await getSession();
  
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const sevenDaysAgo = subDays(new Date(), 7);
  const thirtyDaysAgo = subDays(new Date(), 30);

  // Get usage statistics with error handling
  let totalEvents = 0;
  let pageViews = 0;
  let actions = 0;
  let errors = 0;
  let recentEvents: any[] = [];
  let topPages: any[] = [];
  let topActions: any[] = [];
  let recentFeedback: any[] = [];

  try {
    // Safe wrapper for database queries
    const safeQuery = async <T>(query: () => Promise<T>, defaultValue: T): Promise<T> => {
      try {
        return await query();
      } catch (error) {
        console.error("Database query error:", error);
        return defaultValue;
      }
    };

    const [
      totalEventsResult,
      pageViewsResult,
      actionsResult,
      errorsResult,
      recentEventsResult,
      topPagesResult,
      topActionsResult,
      recentFeedbackResult,
    ] = await Promise.all([
      // Total events (last 30 days)
      safeQuery(() => db.usageEvent.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      }), 0),
      // Page views (last 7 days)
      safeQuery(() => db.usageEvent.count({
        where: {
          eventType: "page_view",
          createdAt: { gte: sevenDaysAgo },
        },
      }), 0),
      // Actions (last 7 days)
      safeQuery(() => db.usageEvent.count({
        where: {
          eventType: "action",
          createdAt: { gte: sevenDaysAgo },
        },
      }), 0),
      // Errors (last 7 days)
      safeQuery(() => db.usageEvent.count({
        where: {
          eventType: "error",
          createdAt: { gte: sevenDaysAgo },
        },
      }), 0),
      // Recent events
      safeQuery(() => db.usageEvent.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          yacht: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }), []),
      // Top pages (last 7 days)
      safeQuery(() => db.usageEvent.groupBy({
        by: ["page"],
        where: {
          eventType: "page_view",
          createdAt: { gte: sevenDaysAgo },
          page: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      }), []),
      // Top actions (last 7 days)
      safeQuery(() => db.usageEvent.groupBy({
        by: ["action"],
        where: {
          eventType: "action",
          createdAt: { gte: sevenDaysAgo },
          action: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      }), []),
      // Recent feedback
      safeQuery(() => db.feedback.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          yacht: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }), []),
    ]);

    totalEvents = typeof totalEventsResult === "number" ? totalEventsResult : 0;
    pageViews = typeof pageViewsResult === "number" ? pageViewsResult : 0;
    actions = typeof actionsResult === "number" ? actionsResult : 0;
    errors = typeof errorsResult === "number" ? errorsResult : 0;
    recentEvents = Array.isArray(recentEventsResult) ? recentEventsResult : [];
    topPages = Array.isArray(topPagesResult) ? topPagesResult.map((item: any) => ({
      page: item?.page || null,
      _count: item?._count ? { id: typeof item._count.id === "number" ? item._count.id : (typeof item._count === "number" ? item._count : 0) } : { id: 0 },
    })) : [];
    topActions = Array.isArray(topActionsResult) ? topActionsResult.map((item: any) => ({
      action: item?.action || null,
      _count: item?._count ? { id: typeof item._count.id === "number" ? item._count.id : (typeof item._count === "number" ? item._count : 0) } : { id: 0 },
    })) : [];
    recentFeedback = Array.isArray(recentFeedbackResult) ? recentFeedbackResult : [];

    totalEvents = typeof totalEventsResult === "number" ? totalEventsResult : 0;
    pageViews = typeof pageViewsResult === "number" ? pageViewsResult : 0;
    actions = typeof actionsResult === "number" ? actionsResult : 0;
    errors = typeof errorsResult === "number" ? errorsResult : 0;
    recentEvents = Array.isArray(recentEventsResult) ? recentEventsResult : [];
    topPages = Array.isArray(topPagesResult) ? topPagesResult.map((item: any) => ({
      ...item,
      _count: item._count || { id: 0 },
    })) : [];
    topActions = Array.isArray(topActionsResult) ? topActionsResult.map((item: any) => ({
      ...item,
      _count: item._count || { id: 0 },
    })) : [];
    recentFeedback = Array.isArray(recentFeedbackResult) ? recentFeedbackResult : [];
  } catch (error) {
    console.error("Error fetching usage statistics:", error);
    // Continue with default values
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usage Insights</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Page Views (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pageViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Errors (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errors.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Most Visited Pages (7 days)</CardTitle>
            <CardDescription>Pages users visit most frequently</CardDescription>
          </CardHeader>
          <CardContent>
            {!topPages || topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No page views recorded yet</p>
            ) : (
              <div className="space-y-2">
                {topPages.map((item: any) => {
                  const count = item?._count?.id ?? item?._count ?? 0;
                  return (
                    <div key={item?.page || "unknown"} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item?.page || "Unknown"}</span>
                      <span className="text-sm text-muted-foreground">{typeof count === "number" ? count : 0}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Most Common Actions (7 days)</CardTitle>
            <CardDescription>Actions users perform most frequently</CardDescription>
          </CardHeader>
          <CardContent>
            {!topActions || topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions recorded yet</p>
            ) : (
              <div className="space-y-2">
                {topActions.map((item: any) => {
                  const count = item?._count?.id ?? item?._count ?? 0;
                  return (
                    <div key={item?.action || "unknown"} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item?.action || "Unknown"}</span>
                      <span className="text-sm text-muted-foreground">{typeof count === "number" ? count : 0}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>User feedback and suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback submitted yet</p>
          ) : (
            <div className="space-y-4">
              {recentFeedback.map((feedback: any) => (
                <div key={feedback.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">
                        {feedback.user?.name || feedback.user?.email || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {feedback.yacht?.name || "No yacht"} • {format(new Date(feedback.createdAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-muted capitalize">
                      {feedback.type}
                    </span>
                  </div>
                  {feedback.page && (
                    <p className="text-xs text-muted-foreground mb-1">Page: {feedback.page}</p>
                  )}
                  <p className="text-sm">{feedback.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">Status: {feedback.status}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest usage events across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded yet</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{event.user?.name || event.user?.email || "Unknown"}</span>
                    <span className="text-muted-foreground ml-2">
                      {event.eventType}
                      {event.page && ` • ${event.page}`}
                      {event.action && ` • ${event.action}`}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.createdAt), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
