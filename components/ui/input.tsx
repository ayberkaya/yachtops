import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground selection:bg-primary selection:text-primary-foreground border-input h-11 w-full min-w-0 rounded-xl border border-zinc-200/60 bg-white px-4 py-2.5 text-sm shadow-sm transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
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

export { Input }
