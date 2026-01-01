"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import anime from "animejs/lib/anime.es.js";

interface ModuleNavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
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
              <TabLink key={link.href} link={link} isActive={isActive} />
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function TabLink({ link, isActive }: { link: ModuleNavLink; isActive: boolean }) {
  const hoverBgRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!hoverBgRef.current || !linkRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const bg = hoverBgRef.current;
    const link = linkRef.current;

    const handleMouseEnter = () => {
      // Reset position
      bg.style.left = '0';
      bg.style.width = '0';
      bg.style.opacity = '1';
      
      // Animate from left to right
      anime({
        targets: bg,
        width: ['0%', '100%'],
        duration: 300,
        easing: 'easeOutCubic',
      });
    };

    const handleMouseLeave = () => {
      anime({
        targets: bg,
        width: ['100%', '0%'],
        opacity: [1, 0],
        duration: 200,
        easing: 'easeInCubic',
      });
    };

    link.addEventListener('mouseenter', handleMouseEnter);
    link.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      link.removeEventListener('mouseenter', handleMouseEnter);
      link.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <Link
      ref={linkRef}
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
      {/* Hover background effect - slides from left to right */}
      <div
        ref={hoverBgRef}
        className="absolute left-0 top-0 bottom-0 bg-zinc-100/50 dark:bg-zinc-800/20 rounded-lg md:rounded-xl opacity-0"
        style={{ width: '0%' }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2 z-10">
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
        {link.badge !== undefined && link.badge !== null && link.badge !== 0 && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-red-500 text-white">
            {typeof link.badge === 'number' && link.badge > 99 ? '99+' : link.badge}
          </span>
        )}
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
}

