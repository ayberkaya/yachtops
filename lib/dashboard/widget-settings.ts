import { db } from "@/lib/db";
import { DashboardWidgets, WidgetConfig, DEFAULT_WIDGETS } from "@/types/widgets";

/**
 * Get user widget settings with defaults merged
 * This centralizes the logic from the API route for reuse
 */
export async function getUserWidgetSettings(userId: string): Promise<WidgetConfig[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { dashboardWidgets: true, role: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  let widgets: WidgetConfig[] = [];

  if (user.dashboardWidgets) {
    try {
      const parsed = JSON.parse(user.dashboardWidgets) as DashboardWidgets;
      widgets = parsed.widgets || [];
    } catch (error) {
      console.error("Error parsing dashboard widgets:", error);
    }
  }

  // If no widgets configured, return defaults for user role
  if (widgets.length === 0) {
    widgets = DEFAULT_WIDGETS[user.role as keyof typeof DEFAULT_WIDGETS] || [];
  } else {
    // Merge with defaults to ensure new widgets are included
    // This ensures that if user has old widget config, new widgets from defaults are added
    const defaultWidgets = DEFAULT_WIDGETS[user.role as keyof typeof DEFAULT_WIDGETS] || [];
    const existingWidgetIds = new Set(widgets.map(w => w.id));
    
    // Add any default widgets that don't exist in user's config
    defaultWidgets.forEach(defaultWidget => {
      if (!existingWidgetIds.has(defaultWidget.id)) {
        widgets.push(defaultWidget);
      }
    });
    
    // Sort by order
    widgets.sort((a, b) => a.order - b.order);
  }

  return widgets;
}

/**
 * Check if a specific widget is enabled for the user
 */
export function isWidgetEnabled(widgets: WidgetConfig[], widgetId: string): boolean {
  const widget = widgets.find(w => w.id === widgetId);
  return widget?.enabled ?? false;
}

/**
 * Get enabled widgets only
 */
export function getEnabledWidgets(widgets: WidgetConfig[]): WidgetConfig[] {
  return widgets.filter(w => w.enabled);
}

