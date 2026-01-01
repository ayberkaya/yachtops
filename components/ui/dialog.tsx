"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import anime from "animejs/lib/anime.es.js"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const overlayRef = useRef<React.ElementRef<typeof DialogPrimitive.Overlay>>(null)

  useEffect(() => {
    if (!overlayRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const overlay = overlayRef.current
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const state = overlay.getAttribute('data-state')
          
          if (state === 'open') {
            anime({
              targets: overlay,
              opacity: [0, 1],
              duration: 300,
              easing: 'easeOutCubic',
            })
          } else if (state === 'closed') {
            anime({
              targets: overlay,
              opacity: [1, 0],
              duration: 200,
              easing: 'easeInCubic',
            })
          }
        }
      })
    })

    observer.observe(overlay, { attributes: true, attributeFilter: ['data-state'] })

    return () => observer.disconnect()
  }, [])

  return (
    <DialogPrimitive.Overlay
      ref={overlayRef}
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/70 dark:bg-black/80 backdrop-blur-md",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const contentRef = useRef<React.ElementRef<typeof DialogPrimitive.Content>>(null)

  useEffect(() => {
    if (!contentRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const content = contentRef.current
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const state = content.getAttribute('data-state')
          
          if (state === 'open') {
            // Reset initial state
            content.style.opacity = '0'
            content.style.transform = 'translate(-50%, -50%) scale(0.95)'
            
            // Animate in
            anime({
              targets: content,
              opacity: [0, 1],
              scale: [0.95, 1],
              duration: 300,
              easing: 'easeOutCubic',
            })
          } else if (state === 'closed') {
            // Animate out
            anime({
              targets: content,
              opacity: [1, 0],
              scale: [1, 0.95],
              duration: 200,
              easing: 'easeInCubic',
            })
          }
        }
      })
    })

    observer.observe(content, { attributes: true, attributeFilter: ['data-state'] })

    return () => observer.disconnect()
  }, [])

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          "bg-white fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-6 rounded-2xl border border-border/50 p-8 shadow-2xl backdrop-blur-sm sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold text-slate-900", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-slate-700", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
