"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Anchor, ArrowRight, Navigation, DollarSign, CheckSquare, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-50"
        disabled
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed top-4 right-4 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:bg-white dark:hover:bg-slate-800"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggleButton />
      </div>
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-xl shadow-teal-500/20 mb-8">
            <Anchor className="text-white w-12 h-12" />
          </div>
          <h1 className="text-6xl sm:text-8xl font-bold tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent">
            YachtOps
          </h1>
          <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-light">
            Enterprise-grade yacht operations management platform
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4 max-w-2xl mx-auto">
            Designed for private yacht owners and charter management companies
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/20 rounded-xl flex items-center justify-center mb-6">
              <Navigation className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">Trip Management</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Comprehensive trip planning, tracking, and documentation for all vessel movements and itineraries.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/20 rounded-xl flex items-center justify-center mb-6">
              <DollarSign className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">Financial Management</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Advanced expense tracking, approval workflows, and financial reporting with full audit trails.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/20 rounded-xl flex items-center justify-center mb-6">
              <CheckSquare className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">Operations Control</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Streamlined task management, crew coordination, and performance tracking for optimal operations.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="h-14 px-10 text-base font-medium bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white shadow-xl shadow-teal-500/20 transition-all duration-200 hover:shadow-2xl hover:shadow-teal-500/30"
          >
            <Link href="/auth/signin" className="flex items-center gap-3">
              Access Platform
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-16 font-light tracking-wide uppercase">
          Enterprise Yacht Operations Platform
        </p>
      </div>
    </div>
  );
}
