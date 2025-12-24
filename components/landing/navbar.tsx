"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? "bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm" 
        : "bg-transparent border-b border-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left: Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/icon-192.png"
                  alt="HelmOps Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-semibold text-slate-900 font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>HelmOps</span>
            </Link>
          </div>

          {/* Center: Navigation Links (Hidden on mobile, visible on desktop) */}
          <div className="hidden lg:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("features")}
              className="text-slate-700 hover:text-slate-900 transition-colors text-sm font-medium"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection("gallery")}
              className="text-slate-700 hover:text-slate-900 transition-colors text-sm font-medium"
            >
              The Experience
            </button>
            <button
              onClick={() => scrollToSection("security")}
              className="text-slate-700 hover:text-slate-900 transition-colors text-sm font-medium"
            >
              Security
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/auth/signin"
              className="text-slate-700 hover:text-slate-900 transition-colors text-sm font-medium"
            >
              Member Login
            </Link>
            <Button 
              onClick={() => scrollToSection("contact")}
              size="sm" 
              className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-900"
            >
              Request Access
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

