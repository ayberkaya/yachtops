"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  style,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive !h-5 !w-5 !min-h-[20px] !min-w-[20px] !max-h-[20px] !max-w-[20px] shrink-0 rounded border shadow-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/50 data-[state=checked]:shadow-md",
        className
      )}
      style={{
        height: '20px',
        width: '20px',
        minHeight: '20px',
        minWidth: '20px',
        maxHeight: '20px',
        maxWidth: '20px',
        ...style
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="h-4 w-4 stroke-[2]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
