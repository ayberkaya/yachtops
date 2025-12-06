"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Anchor, 
  Ship, 
  Activity, 
  DollarSign, 
  CheckSquare, 
  Users, 
  MessageSquare,
  TrendingUp,
  FileText,
  Package,
  Wrench,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Clock,
  Globe,
  Sparkles
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: DollarSign,
      title: "Expense Management",
      description: "Track and manage all yacht expenses with detailed categorization and approval workflows.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: CheckSquare,
      title: "Task Management",
      description: "Organize crew tasks, maintenance schedules, and operational checklists efficiently.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Users,
      title: "Crew Management",
      description: "Manage crew documents, schedules, and communications in one centralized platform.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: MessageSquare,
      title: "Team Communication",
      description: "Real-time messaging and channel-based communication for seamless coordination.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Package,
      title: "Inventory Control",
      description: "Track supplies, alcohol stock, and shopping lists with automated alerts.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Wrench,
      title: "Maintenance Logs",
      description: "Comprehensive maintenance tracking with schedules, history, and documentation.",
      color: "from-teal-500 to-cyan-500"
    },
    {
      icon: FileText,
      title: "Document Management",
      description: "Secure storage and organization of vessel documents, permits, and certifications.",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Monitor vessel performance metrics and generate detailed monthly reports.",
      color: "from-rose-500 to-pink-500"
    }
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and security protocols"
    },
    {
      icon: Clock,
      title: "Real-time Sync",
      description: "Instant updates across all devices and team members"
    },
    {
      icon: Globe,
      title: "Cloud-Based",
      description: "Access from anywhere, anytime with cloud infrastructure"
    },
    {
      icon: Sparkles,
      title: "Intuitive Design",
      description: "Beautiful, modern interface that's easy to use"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
      {/* Background - Subtle geometric patterns */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-100/30 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur-sm"
              style={{ animation: 'fadeInUp 0.6s ease-out forwards', opacity: 0 }}
            >
              <Zap className="h-4 w-4" />
              <span>Professional Yacht Management Platform</span>
            </div>
            
            {/* Main Heading */}
            <div 
              className="space-y-6"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.1s forwards', opacity: 0 }}
            >
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                YachtOps
              </h1>
              
              <p className="text-2xl sm:text-3xl md:text-4xl text-slate-700 font-medium max-w-4xl mx-auto leading-tight">
                Complete Operations Management Platform
                <br />
                <span className="text-xl sm:text-2xl md:text-3xl text-slate-600 font-normal">
                  for Modern Yacht Operations
                </span>
              </p>
            </div>

            {/* CTA Buttons */}
            <div 
              className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center pt-6"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.2s forwards', opacity: 0 }}
            >
              <Button 
                asChild 
                size="lg" 
                className="group px-10 py-7 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
              >
                <Link href="/auth/signin">
                  Access Platform
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="px-10 py-7 text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
              >
                <Link href="/demo-request">
                  Request a Demo
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="px-10 py-7 text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
              >
                <Link href="/contact">
                  Contact Sales
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="px-10 py-7 text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
              >
                <Link href="/fleet-solutions">
                  Fleet Solutions
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div 
              className="flex flex-wrap items-center justify-center gap-6 pt-16"
              style={{ animation: 'fadeIn 1s ease-out 0.4s forwards', opacity: 0 }}
            >
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={benefit.title}
                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    style={{ animation: `fadeIn 0.6s ease-out ${0.5 + index * 0.1}s forwards`, opacity: 0 }}
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                        {benefit.title}
                      </div>
                      <div className="text-xs text-slate-600">
                        {benefit.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <div 
              className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6"
              style={{ animation: 'fadeInUp 0.6s ease-out forwards', opacity: 0 }}
            >
              Features
            </div>
            <h2 
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.1s forwards', opacity: 0 }}
            >
              Comprehensive Management Solutions
            </h2>
            <p 
              className="text-xl text-slate-600 max-w-3xl mx-auto font-medium"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.2s forwards', opacity: 0 }}
            >
              Everything you need to manage your yacht operations efficiently and professionally
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative p-8 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-300 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl shadow-lg"
                  style={{ 
                    animation: `fadeInUp 0.6s ease-out ${0.3 + index * 0.1}s forwards`,
                    opacity: 0 
                  }}
                >
                  {/* Gradient accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div className="flex flex-col gap-5">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${feature.color} w-fit shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3 text-slate-900 group-hover:text-blue-600 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div 
            className="relative p-16 rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 overflow-hidden shadow-2xl"
            style={{ animation: 'fadeIn 1s ease-out forwards', opacity: 0 }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative text-center space-y-8 z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 border border-white/30 shadow-xl">
                <Ship className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white">
                Ready to Streamline Your Operations?
              </h2>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto font-medium">
                Join professional yacht management teams who trust YachtOps for their daily operations
              </p>
              <div className="pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="group px-10 py-7 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-white text-blue-600 hover:bg-blue-50 border-0"
                >
                  <Link href="/auth/signin">
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t-2 border-slate-200 bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <Anchor className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                YachtOps
              </span>
            </div>
            <p className="text-sm text-slate-600 text-center md:text-right font-medium">
              © {new Date().getFullYear()} YachtOps. Professional yacht operations management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
