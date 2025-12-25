"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ModuleNavLink {
  href: string;
  label: string;
}

interface ModuleNavProps {
  links: ModuleNavLink[];
}

export function ModuleNav({ links }: ModuleNavProps) {
  const pathname = usePathname();

  return (
    <div className="mb-6 -mx-4 md:-mx-8 lg:-mx-10 xl:-mx-12 px-4 md:px-8 lg:px-10 xl:px-12">
      <nav 
        className="inline-flex bg-zinc-100/80 p-1 rounded-lg overflow-x-auto" 
        aria-label="Module navigation"
      >
        <div className="flex space-x-1">
          {links.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative whitespace-nowrap px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-md",
                  isActive
                    ? "text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab-pill"
                    className="absolute inset-0 bg-white shadow-sm rounded-md"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      mass: 0.5,
                    }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

