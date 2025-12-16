import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickStatsWidgetProps {
  stats: Array<{
    label: string;
    value: string | number;
    description?: string;
  }>;
}

export const QuickStatsWidget = memo(function QuickStatsWidget({ stats }: QuickStatsWidgetProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.description && (
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

