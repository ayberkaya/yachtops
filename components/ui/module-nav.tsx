"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface ModuleNavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface ModuleNavProps {
  links: ModuleNavLink[];
}

export function ModuleNav({ links }: ModuleNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (!navRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollability();
    const nav = navRef.current;
    if (!nav) return;

    nav.addEventListener("scroll", checkScrollability);
    window.addEventListener("resize", checkScrollability);

    // Check after a short delay to ensure layout is complete
    const timeout = setTimeout(checkScrollability, 100);

    return () => {
      nav.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
      clearTimeout(timeout);
    };
  }, [links]);

  const scroll = (direction: "left" | "right") => {
    if (!navRef.current) return;
    const scrollAmount = 200;
    navRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="mb-6 -mx-4 md:-mx-8 lg:-mx-10 xl:-mx-12 px-4 md:px-8 lg:px-10 xl:px-12">
      <div className="relative">
        {/* Scroll indicators with arrows - only visible on mobile when scrollable */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 md:hidden
                         flex items-center justify-center w-8 h-8 rounded-full
                         bg-background/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800
                         shadow-sm hover:shadow-md
                         transition-all duration-200
                         active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} className="text-zinc-600 dark:text-zinc-400" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 md:hidden
                         flex items-center justify-center w-8 h-8 rounded-full
                         bg-background/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800
                         shadow-sm hover:shadow-md
                         transition-all duration-200
                         active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} className="text-zinc-600 dark:text-zinc-400" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Enhanced fade gradients for mobile scroll indication */}
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none md:hidden",
            "bg-gradient-to-r from-background via-background/90 to-transparent",
            "transition-opacity duration-300",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )} 
        />
        <div 
          className={cn(
            "absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none md:hidden",
            "bg-gradient-to-l from-background via-background/90 to-transparent",
            "transition-opacity duration-300",
            canScrollRight ? "opacity-100" : "opacity-0"
          )} 
        />
        
        <nav 
          ref={navRef}
          className={cn(
            "flex gap-1 md:gap-2",
            "overflow-x-auto scrollbar-hide",
            "scroll-smooth snap-x snap-mandatory",
            "pb-1"
          )}
          aria-label="Module navigation"
        >
          {links.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative whitespace-nowrap",
                  "py-2.5 md:py-2.5 px-3 md:px-4",
                  "text-xs md:text-sm font-medium",
                  "transition-all duration-300 ease-out",
                  "snap-start",
                  "flex-shrink-0",
                  "min-w-fit",
                  "rounded-lg md:rounded-xl",
                  "group",
                  "text-foreground hover:text-foreground/80"
                )}
              >
                {/* Hover background effect - for all items */}
                <motion.div
                  className="absolute inset-0 bg-zinc-100/50 dark:bg-zinc-800/20 rounded-lg md:rounded-xl opacity-0 group-hover:opacity-100"
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                />

                {/* Content */}
                <div className="relative flex items-center justify-center z-10">
                  <motion.span 
                    className="leading-tight relative"
                    animate={{
                      y: 0,
                    }}
                    transition={{
                      duration: 0.2,
                      ease: "easeOut",
                    }}
                  >
                    {link.label}
                  </motion.span>
                </div>

                {/* Active underline accent */}
                {isActive && (
                  <motion.div
                    layoutId="active-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400 rounded-full"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.5,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

