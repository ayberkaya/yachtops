import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-4xl space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

