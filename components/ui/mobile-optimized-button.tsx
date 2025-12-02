"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

interface MobileOptimizedButtonProps extends ComponentProps<typeof Button> {
  children: React.ReactNode;
}

/**
 * Button component optimized for mobile with proper touch targets
 */
export function MobileOptimizedButton({
  className,
  children,
  ...props
}: MobileOptimizedButtonProps) {
  return (
    <Button
      className={cn(
        "min-h-[44px] min-w-[44px] touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

