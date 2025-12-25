"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
    <div className="border-b border-border mb-6 -mx-4 md:-mx-8 lg:-mx-10 xl:-mx-12 px-4 md:px-8 lg:px-10 xl:px-12">
      <nav className="flex space-x-8 overflow-x-auto" aria-label="Module navigation">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap border-b-2 pb-3 px-1 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

