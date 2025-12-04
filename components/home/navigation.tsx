"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Anchor } from "lucide-react";

export function Navigation() {

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent rounded-lg border border-border shadow-sm">
              <Anchor className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              YachtOps
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild className="text-foreground hover:bg-accent text-sm sm:text-base px-3 sm:px-4">
              <Link href="/auth/signin" className="hidden sm:inline">Sign In</Link>
            </Button>
            <Button asChild className="shadow-md hover:shadow-lg text-sm sm:text-base px-4 sm:px-6">
              <Link href="/auth/signin">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

