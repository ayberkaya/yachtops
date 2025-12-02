import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-20 w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm shadow-sm transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 hover:border-border focus-visible:shadow-md",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
