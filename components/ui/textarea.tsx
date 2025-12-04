import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-20 w-full rounded-xl border border-border/50 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 hover:border-border focus-visible:shadow-md text-slate-900 placeholder:text-slate-400",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
