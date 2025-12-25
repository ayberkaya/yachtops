"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

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

  return (
    <div className="mb-6 -mx-4 md:-mx-8 lg:-mx-10 xl:-mx-12 px-4 md:px-8 lg:px-10 xl:px-12">
      <nav 
        className="flex gap-6 border-b border-zinc-200 overflow-x-auto" 
        aria-label="Module navigation"
      >
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative whitespace-nowrap py-3 text-sm transition-colors duration-200",
                isActive
                  ? "text-zinc-900 font-semibold"
                  : "text-zinc-500 font-medium hover:text-zinc-800"
              )}
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon size={16} className="flex-shrink-0" />}
                <span>{link.label}</span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900"
                  transition={{
                    type: "spring",
                    stiffness: 500,
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
  );
}

