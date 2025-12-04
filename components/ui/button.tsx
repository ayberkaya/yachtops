import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:scale-[1.02] shadow-sm hover:shadow-md active:scale-[0.98] [&_svg]:text-primary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:scale-[1.02] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 shadow-sm hover:shadow-md active:scale-[0.98] [&_svg]:text-white",
        outline:
          "border border-border/50 bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-lg hover:scale-[1.02] shadow-sm hover:shadow-md active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg hover:scale-[1.02] shadow-sm hover:shadow-md active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline cursor-pointer",
      },
      size: {
        default: "h-11 min-h-[44px] px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-10 min-h-[44px] rounded-lg gap-1.5 px-4 has-[>svg]:px-3 text-xs",
        lg: "h-12 min-h-[44px] rounded-xl px-6 has-[>svg]:px-5",
        icon: "size-11 min-h-[44px] min-w-[44px]",
        "icon-sm": "size-10 min-h-[44px] min-w-[44px]",
        "icon-lg": "size-12 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
