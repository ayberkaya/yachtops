"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { 
  WifiOff,
  Receipt,
  UserCheck,
  Sparkles,
  Shield,
  Lock,
  Smartphone
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { toast, toasts, removeToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    yachtName: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Request Received",
        description: "We will contact you shortly.",
        variant: "success",
      });
      setFormData({ name: "", yachtName: "", email: "", message: "" });
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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
                  onClick={() => {
                    const element = document.getElementById("contact");
                    element?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  size="lg" 
                  variant="outline" 
                  className="px-8 py-6 text-lg border-slate-900 text-slate-900 hover:bg-stone-50"
                >
                  Request Access
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
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-stone-50">
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

      {/* Gallery Section - The Experience */}
      <section id="gallery" className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              The Experience
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              See how HelmOps transforms yacht operations
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Mockup 1 */}
            <div className="relative aspect-[4/3] rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
              <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 flex flex-col">
                <div className="h-12 border-b border-stone-200 flex items-center px-4 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6">
                      <Image
                        src="/icon-192.png"
                        alt="HelmOps"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <div className="h-3 bg-stone-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex-1 p-4 grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-stone-50 rounded-lg border border-stone-200"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mockup 2 */}
            <div className="relative aspect-[4/3] rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
              <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 flex flex-col">
                <div className="h-12 border-b border-stone-200 flex items-center px-4 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6">
                      <Image
                        src="/icon-192.png"
                        alt="HelmOps"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <div className="h-3 bg-stone-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <div className="h-4 bg-stone-100 rounded w-full"></div>
                  <div className="h-4 bg-stone-100 rounded w-5/6"></div>
                  <div className="h-4 bg-stone-100 rounded w-4/6"></div>
                  <div className="mt-4 h-32 bg-stone-50 rounded-lg border border-stone-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-32 px-4 sm:px-6 lg:px-8 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Enterprise-Grade Security
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Your data is protected with the highest standards
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-stone-200 mx-auto" style={{ borderColor: '#C5A059' }}>
                <Shield className="w-7 h-7" style={{ color: '#C5A059' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Secure by Default
              </h3>
              <p className="text-slate-600 leading-relaxed">
                End-to-end encryption and secure data storage
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-stone-200 mx-auto" style={{ borderColor: '#C5A059' }}>
                <Lock className="w-7 h-7" style={{ color: '#C5A059' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                GDPR Compliant
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Full compliance with international data protection regulations
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-stone-200 mx-auto" style={{ borderColor: '#C5A059' }}>
                <Smartphone className="w-7 h-7" style={{ color: '#C5A059' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Offline-First
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Your data stays local, syncing only when connected
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
              onClick={() => {
                const element = document.getElementById("contact");
                element?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              size="lg" 
              variant="outline" 
              className="px-8 py-6 text-lg border-slate-900 text-slate-900 hover:bg-stone-50"
            >
              Request Access
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-32 px-4 sm:px-6 lg:px-8 bg-stone-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Request Access
            </h2>
            <p className="text-xl text-slate-600 max-w-xl mx-auto">
              Tell us about your vessel and we'll get in touch
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-2">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label htmlFor="yachtName" className="block text-sm font-medium text-slate-900 mb-2">
                Yacht Name
              </label>
              <Input
                id="yachtName"
                type="text"
                required
                value={formData.yachtName}
                onChange={(e) => setFormData({ ...formData, yachtName: e.target.value })}
                className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900"
                placeholder="M/Y Serenity"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-900 mb-2">
                Message
              </label>
              <Textarea
                id="message"
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 min-h-[120px]"
                placeholder="Tell us about your vessel and operational needs..."
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-6 text-lg"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
