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

  // Get usage statistics
  const [
    totalEvents,
    pageViews,
    actions,
    errors,
    recentEvents,
    topPages,
    topActions,
    recentFeedback,
  ] = await Promise.all([
    // Total events (last 30 days)
    db.usageEvent.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // Page views (last 7 days)
    db.usageEvent.count({
      where: {
        eventType: "page_view",
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    // Actions (last 7 days)
    db.usageEvent.count({
      where: {
        eventType: "action",
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    // Errors (last 7 days)
    db.usageEvent.count({
      where: {
        eventType: "error",
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    // Recent events
    db.usageEvent.findMany({
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
    }),
    // Top pages (last 7 days)
    db.usageEvent.groupBy({
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
    }),
    // Top actions (last 7 days)
    db.usageEvent.groupBy({
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
    }),
    // Recent feedback
    db.feedback.findMany({
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
    }),
  ]);

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
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No page views recorded yet</p>
            ) : (
              <div className="space-y-2">
                {topPages.map((item) => (
                  <div key={item.page} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.page || "Unknown"}</span>
                    <span className="text-sm text-muted-foreground">{item._count.id}</span>
                  </div>
                ))}
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
            {topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions recorded yet</p>
            ) : (
              <div className="space-y-2">
                {topActions.map((item) => (
                  <div key={item.action} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.action || "Unknown"}</span>
                    <span className="text-sm text-muted-foreground">{item._count.id}</span>
                  </div>
                ))}
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
              {recentFeedback.map((feedback) => (
                <div key={feedback.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">
                        {feedback.user.name || feedback.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {feedback.yacht?.name} • {format(new Date(feedback.createdAt), "MMM d, yyyy HH:mm")}
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
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{event.user.name || event.user.email}</span>
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

