import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input flex field-sizing-content min-h-20 w-full rounded-xl border border-zinc-200/60 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "text-zinc-900 placeholder:text-zinc-400",
        "focus-visible:ring-2 focus-visible:ring-zinc-400/20 focus-visible:border-zinc-400 focus-visible:ring-offset-0",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "hover:border-zinc-300/60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
