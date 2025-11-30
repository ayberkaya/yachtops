import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">YachtOps</h1>
          <p className="text-xl text-muted-foreground">
            Complete yacht operations management system for private and charter yachts
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
