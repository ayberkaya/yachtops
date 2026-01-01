import { memo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickStatsWidgetProps {
  stats: Array<{
    label: string;
    value: string | number;
    description?: string;
    href?: string;
  }>;
}

export const QuickStatsWidget = memo(function QuickStatsWidget({ stats }: QuickStatsWidgetProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const cardContent = (
          <Card className={stat.href ? "cursor-pointer transition-all hover:shadow-md" : ""}>
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
        );
        
        if (stat.href) {
          return (
            <Link key={index} href={stat.href} className="block">
              {cardContent}
            </Link>
          );
        }
        
        return <div key={index}>{cardContent}</div>;
      })}
    </div>
  );
});

