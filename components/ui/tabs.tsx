"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        "flex gap-1 md:gap-2 pb-1",
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs");
  }

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        "relative whitespace-nowrap",
        "py-2.5 md:py-2.5 px-3 md:px-4",
        "text-xs md:text-sm font-medium",
        "transition-all duration-300 ease-out",
        "rounded-lg md:rounded-xl",
        "group",
        "text-foreground hover:text-foreground/80",
        "flex items-center justify-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {/* Hover background effect */}
      <motion.div
        className="absolute inset-0 bg-zinc-100/50 dark:bg-zinc-800/20 rounded-lg md:rounded-xl opacity-0 group-hover:opacity-100"
        transition={{
          duration: 0.2,
          ease: "easeOut",
        }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-1.5 md:gap-2 z-10 w-full">
        <span className="leading-tight relative text-center">
          {children}
        </span>
      </div>

      {/* Active underline accent */}
      {isActive && (
        <motion.div
          layoutId={`tabs-underline-${value}`}
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
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within Tabs");
  }

  if (context.value !== value) {
    return null;
  }

  return <div className={cn("mt-2", className)}>{children}</div>;
}

