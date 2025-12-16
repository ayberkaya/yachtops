export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-48 animate-pulse bg-muted rounded-lg" />
          <div className="h-10 w-10 animate-pulse bg-muted rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-6 w-64 animate-pulse bg-muted rounded-lg" />
          <div className="h-10 w-32 animate-pulse bg-muted rounded-lg" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
        <div className="h-32 animate-pulse bg-muted rounded-lg" />
      </div>
    </div>
  );
}

