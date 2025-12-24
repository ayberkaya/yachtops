"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  WifiOff,
  Receipt,
  UserCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-white border-b border-stone-200 shadow-sm" 
          : "bg-transparent border-b border-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
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
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
                <Link href="/contact">Contact</Link>
              </Button>
              <Button 
                asChild 
                size="sm" 
                className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-900"
              >
                <Link href="mailto:onboarding@helmops.com">Request Access</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-50 border border-stone-200 text-sm text-slate-700">
                <Sparkles className="w-4 h-4" style={{ color: '#C5A059' }} />
                <span>Exclusive Concierge Onboarding</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                The Operating System
                <br />
                for the Modern Superyacht.
              </h1>
              
              <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-2xl">
                Seamless operations, offline capability, and financial clarity. 
                <span className="text-slate-900"> Designed for the elite.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-8 py-6 text-lg transition-all"
                >
                  <Link href="/demo-request">Book a Private Demo</Link>
                </Button>
                <Button 
                  asChild 
                  size="lg" 
                  variant="outline" 
                  className="px-8 py-6 text-lg border-slate-900 text-slate-900 hover:bg-stone-50"
                >
                  <Link href="mailto:onboarding@helmops.com">Request Access</Link>
                </Button>
              </div>
            </div>

            {/* Right: Floating Card Mockup */}
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden">
                {/* Floating Card Effect */}
                <div className="absolute inset-8 rounded-xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 shadow-xl flex flex-col">
                  {/* Mock Header */}
                  <div className="h-16 border-b border-stone-200 flex items-center px-6 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8">
                        <Image
                          src="/icon-192.png"
                          alt="HelmOps"
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <div className="h-4 bg-stone-200 rounded w-32"></div>
                    </div>
                  </div>
                  
                  {/* Mock Content */}
                  <div className="flex-1 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-stone-100 rounded w-3/4"></div>
                      <div className="h-4 bg-stone-100 rounded w-1/2"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-stone-50 rounded-lg border border-stone-200"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - The "Why" */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Built for Excellence
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Three pillars that define the HelmOps experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Uninterrupted Power */}
            <div className="group bg-white rounded-xl p-8 border border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-stone-200 group-hover:border-[#C5A059] transition-colors">
                <WifiOff className="w-7 h-7" style={{ color: '#C5A059' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Uninterrupted Power
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Built with Offline-First technology. Works perfectly in the middle of the Atlantic.
              </p>
            </div>

            {/* Feature 2: Financial Control */}
            <div className="group bg-white rounded-xl p-8 border border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-stone-200 group-hover:border-[#C5A059] transition-colors">
                <Receipt className="w-7 h-7" style={{ color: '#C5A059' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Financial Control
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Instant receipt capture and budget tracking. Complete transparency at your fingertips.
              </p>
            </div>

            {/* Feature 3: Concierge Service */}
            <div className="group bg-white rounded-xl p-8 border border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-stone-200 group-hover:border-[#C5A059] transition-colors">
                <UserCheck className="w-7 h-7" style={{ color: '#C5A059' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Concierge Service
              </h3>
              <p className="text-slate-600 leading-relaxed">
                We set everything up for you. No learning curve. Just seamless operations from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Experience the Difference
          </h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join the world's most prestigious superyachts. Request your private demonstration today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg" 
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-8 py-6 text-lg transition-all"
            >
              <Link href="/demo-request">Book a Private Demo</Link>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline" 
              className="px-8 py-6 text-lg border-slate-900 text-slate-900 hover:bg-stone-50"
            >
              <Link href="mailto:onboarding@helmops.com">Request Access</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Minimalist */}
      <footer className="bg-white border-t border-stone-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <div className="relative w-8 h-8">
                  <Image
                    src="/icon-192.png"
                    alt="HelmOps Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900 font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>HelmOps</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
              <Link href="/demo-request" className="hover:text-slate-900 transition-colors">Demo</Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-stone-200 text-center text-sm text-slate-500">
            <p>© 2024 HelmOps. Crafted for the seas.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
