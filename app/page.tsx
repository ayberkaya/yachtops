"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useActionState, useEffect, useState, startTransition } from "react";
import { submitLead, type SubmitLeadState } from "@/actions/submit-lead";

export default function Home() {
  const { toast, toasts, removeToast } = useToast();
  
  const [formData, setFormData] = useState<{
    full_name: string;
    role: string;
    email: string;
    vessel_size: string;
    vessel_name: string;
    message: string;
  }>({
    full_name: "",
    role: "",
    email: "",
    vessel_size: "",
    vessel_name: "",
    message: "",
  });

  const initialState: SubmitLeadState = {
    success: false,
    message: "",
  };

  const [state, formAction, isPending] = useActionState(submitLead, initialState);

  // Handle success/error toasts and reset form on success
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Request Received",
          description: "Our concierge team will be in touch.",
          variant: "success",
        });
        // Reset form on success
        setFormData({
          full_name: "",
          role: "",
          email: "",
          vessel_size: "",
          vessel_name: "",
          message: "",
        });
      } else {
        toast({
          title: "Submission Failed",
          description: state.message,
          variant: "error",
        });
      }
    }
  }, [state, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formDataObj = new FormData();
    formDataObj.append("full_name", formData.full_name || "");
    formDataObj.append("role", formData.role || "");
    formDataObj.append("email", formData.email || "");
    formDataObj.append("vessel_size", formData.vessel_size || "");
    formDataObj.append("vessel_name", formData.vessel_name || "");
    formDataObj.append("message", formData.message || "");
    startTransition(() => {
      formAction(formDataObj);
    });
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
                <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 shadow-xl flex flex-col">
                  {/* Mock Header */}
                  <div className="h-12 border-b border-stone-200 flex items-center px-4 bg-white rounded-t-xl">
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
                      <div className="h-3 bg-stone-300 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Mock Content - Dashboard Overview */}
                  <div className="flex-1 p-4 space-y-3 bg-white rounded-b-xl">
                    <div className="space-y-2">
                      <div className="h-3 bg-stone-200 rounded w-full"></div>
                      <div className="h-3 bg-stone-200 rounded w-2/3"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-gradient-to-br from-stone-100 to-stone-50 rounded-lg border border-stone-200 shadow-sm"></div>
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
            {/* Mockup 1 - Grid Layout (Dashboard Overview) */}
            <div className="relative aspect-[4/3] rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
              <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 flex flex-col shadow-lg">
                {/* Browser/App Header */}
                <div className="h-12 border-b border-stone-200 flex items-center px-4 bg-white rounded-t-xl">
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
                    <div className="h-3 bg-stone-300 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                {/* Grid Content - 2x2 Layout */}
                <div className="flex-1 p-4 grid grid-cols-2 gap-3 bg-white rounded-b-xl">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gradient-to-br from-stone-100 to-stone-50 rounded-lg border border-stone-200 shadow-sm flex items-center justify-center">
                      <div className="text-stone-400 text-xs font-medium">Widget {i}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mockup 2 - List/Detail Layout (Operations View) */}
            <div className="relative aspect-[4/3] rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
              <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 flex flex-col shadow-lg">
                {/* Browser/App Header */}
                <div className="h-12 border-b border-stone-200 flex items-center px-4 bg-white rounded-t-xl">
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
                    <div className="h-3 bg-stone-300 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                {/* List Content */}
                <div className="flex-1 p-4 space-y-3 bg-white rounded-b-xl">
                  <div className="space-y-2">
                    <div className="h-3 bg-stone-200 rounded w-full"></div>
                    <div className="h-3 bg-stone-200 rounded w-5/6"></div>
                    <div className="h-3 bg-stone-200 rounded w-4/6"></div>
                  </div>
                  <div className="mt-4 h-32 bg-gradient-to-br from-stone-100 to-stone-50 rounded-lg border border-stone-200 shadow-sm flex items-center justify-center">
                    <div className="text-stone-400 text-xs font-medium">Detail View</div>
                  </div>
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
            {/* Row 1: Name and Role */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-900 mb-2">
                  Full Name
                </label>
                <Input
                  id="full_name"
                  type="text"
                  required
                  value={formData.full_name ?? ""}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-900 mb-2">
                  Role
                </label>
                <Select
                  required
                  value={formData.role || undefined}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="w-full h-12 bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Captain">Captain</SelectItem>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Yacht Manager">Yacht Manager</SelectItem>
                    <SelectItem value="Chief Stew">Chief Stew</SelectItem>
                    <SelectItem value="Purser">Purser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Email and Yacht Size */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email ?? ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="vessel_size" className="block text-sm font-medium text-slate-900 mb-2">
                  Yacht Size
                </label>
                <Input
                  id="vessel_size"
                  type="text"
                  required
                  value={formData.vessel_size ?? ""}
                  onChange={(e) => setFormData({ ...formData, vessel_size: e.target.value })}
                  className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg"
                  placeholder="e.g. 45m"
                />
              </div>
            </div>

            {/* Row 3: Yacht Name (Full Width) */}
            <div>
              <label htmlFor="vessel_name" className="block text-sm font-medium text-slate-900 mb-2">
                Yacht Name
              </label>
              <Input
                id="vessel_name"
                type="text"
                required
                value={formData.vessel_name ?? ""}
                onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg"
                placeholder="M/Y Serenity"
              />
            </div>

            {/* Row 4: Message (Full Width) */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-900 mb-2">
                Message
              </label>
              <Textarea
                id="message"
                required
                value={formData.message ?? ""}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 min-h-[120px] rounded-lg"
                placeholder="Tell us about your vessel and operational needs..."
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-6 text-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Sending..." : "Request Private Demo"}
            </Button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}

