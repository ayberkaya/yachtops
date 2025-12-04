"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Anchor, 
  Ship, 
  Navigation, 
  Activity, 
  DollarSign, 
  CheckSquare, 
  Users, 
  MessageSquare,
  TrendingUp,
  ShoppingCart,
  FileText,
  Package,
  Wrench,
  ArrowRight,
  Shield,
  Zap,
  BarChart3
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: DollarSign,
      title: "Expense Management",
      description: "Track and manage all yacht expenses with detailed categorization and approval workflows."
    },
    {
      icon: CheckSquare,
      title: "Task Management",
      description: "Organize crew tasks, maintenance schedules, and operational checklists efficiently."
    },
    {
      icon: Users,
      title: "Crew Management",
      description: "Manage crew documents, schedules, and communications in one centralized platform."
    },
    {
      icon: MessageSquare,
      title: "Team Communication",
      description: "Real-time messaging and channel-based communication for seamless coordination."
    },
    {
      icon: Package,
      title: "Inventory Control",
      description: "Track supplies, alcohol stock, and shopping lists with automated alerts."
    },
    {
      icon: Wrench,
      title: "Maintenance Logs",
      description: "Comprehensive maintenance tracking with schedules, history, and documentation."
    },
    {
      icon: FileText,
      title: "Document Management",
      description: "Secure storage and organization of vessel documents, permits, and certifications."
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Monitor vessel performance metrics and generate detailed monthly reports."
    }
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden transition-colors">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        {/* Light mode - Soft pastel gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/30 dark:bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 dark:bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-accent/15 dark:bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-accent/20 dark:hidden rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-accent/15 dark:hidden rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent rounded-lg border border-border shadow-sm">
                <Anchor className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                YachtOps
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild className="text-foreground hover:bg-accent">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild className="shadow-md hover:shadow-lg">
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            {/* Main Heading */}
            <div 
              className="space-y-6"
              style={{ animation: 'fadeInUp 0.8s ease-out forwards', opacity: 0 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border text-sm text-accent-foreground font-medium shadow-sm">
                <Zap className="h-4 w-4" />
                <span>Professional Yacht Management Platform</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground">
                YachtOps
              </h1>
              
              <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
                Complete Operations Management Platform
                <br />
                <span className="text-lg sm:text-xl md:text-2xl">for Modern Yacht Operations</span>
              </p>
            </div>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.2s forwards', opacity: 0 }}
            >
              <Button 
                asChild 
                size="lg" 
                className="group px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
                className="px-8 py-6 text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Link href="/auth/signin">
                  Learn More
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div 
              className="flex flex-wrap items-center justify-center gap-8 pt-12 text-sm"
              style={{ animation: 'fadeIn 1s ease-out 0.4s forwards', opacity: 0 }}
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-md text-foreground font-medium backdrop-blur-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span>Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-md text-foreground font-medium backdrop-blur-sm">
                <Activity className="h-4 w-4 text-primary" />
                <span>Real-time Updates</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-md text-foreground font-medium backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Performance Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Comprehensive Management Solutions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your yacht operations efficiently and professionally
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 shadow-md backdrop-blur-sm"
                  style={{ 
                    animation: `fadeInUp 0.6s ease-out ${0.1 * index}s forwards`,
                    opacity: 0 
                  }}
                >
                  <div className="flex flex-col gap-4">
                    <div className="p-3 bg-accent rounded-lg w-fit group-hover:bg-accent/80 transition-all border border-border shadow-sm">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-card-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div 
            className="relative p-12 rounded-3xl border border-border bg-card overflow-hidden shadow-xl backdrop-blur-sm"
            style={{ animation: 'fadeIn 1s ease-out forwards', opacity: 0 }}
          >
            <div className="absolute inset-0 bg-accent/30 dark:from-primary/10 dark:via-primary/5 dark:to-primary/10" />
            <div className="relative text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 border border-border shadow-md">
                <Ship className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-card-foreground">
                Ready to Streamline Your Operations?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join professional yacht management teams who trust YachtOps for their daily operations
              </p>
              <div className="pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="group px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
      <footer className="relative border-t border-border bg-background/95 backdrop-blur-sm py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent rounded-lg border border-border shadow-sm">
                <Anchor className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                YachtOps
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-right">
              © {new Date().getFullYear()} YachtOps. Professional yacht operations management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
