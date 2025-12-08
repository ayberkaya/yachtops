"use client";

import Head from "next/head";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { Anchor, Shield, ShieldCheck, DollarSign, Users, ClipboardCheck, Package, FileText, Route, Briefcase, ShipWheel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BenefitCard = {
  title: string;
  description: string;
};

type ModuleCard = {
  icon: React.ElementType;
  title: string;
  outcome: string;
};

type SegmentProfile = {
  title: string;
  pains: string[];
  wins: string[];
  icon: React.ElementType;
};

export default function Home() {
  const testimonialKeyframes = `
    @keyframes testimonialFade {
      0% { opacity: 0; transform: translateY(8px); }
      10% { opacity: 1; transform: translateY(0); }
      90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-6px); }
    }
  `;
  const benefitCards: BenefitCard[] = [
    {
      title: "Real-time cost & fuel control",
      description: "Live spend, bunkers, and burn-rate dashboards keep overruns visible before they happen.",
    },
    {
      title: "Owner approvals in minutes",
      description: "Forward every line item to the owner’s phone for fast approvals without email chains.",
    },
    {
      title: "Crew & payroll visibility",
      description: "Know who is onboard, which certificates expire, and what payroll is due this week.",
    },
    {
      title: "Stock & maintenance without chaos",
      description: "Provisioning, tenders, spares, and work orders stay in one live system.",
    },
    {
      title: "Post-voyage profitability",
      description: "Automatic profit & loss per trip and route insights for the next charter.",
    },
  ];

  const processSteps = [
    "Create your yacht and invite the shore team",
    "Capture daily expenses, crew actions, and stock updates",
    "Owners approve on mobile while captains track progress",
    "Instant reports show cash, fuel, and voyage insights",
  ];

  const modules: ModuleCard[] = [
    {
      icon: DollarSign,
      title: "Budget & Costs",
      outcome: "Live view of spend vs. budget with approval trails.",
    },
    {
      icon: Users,
      title: "Crew & Payroll",
      outcome: "Schedules, documents, and payroll exports without spreadsheets.",
    },
    {
      icon: Package,
      title: "Stock Control",
      outcome: "Provisioning, fuel, and spares in one replenishment board.",
    },
    {
      icon: Route,
      title: "Voyages & Fuel",
      outcome: "Track routes, bunkers, and post-voyage profitability per trip.",
    },
    {
      icon: ClipboardCheck,
      title: "Work Orders",
      outcome: "Maintenance plans with checklist accountability and photos.",
    },
    {
      icon: FileText,
      title: "Compliance & Documents",
      outcome: "Permits, crew certs, and vessel documents with expiry alerts.",
    },
  ];

  const segments: SegmentProfile[] = [
    {
      title: "Yacht Owners",
      icon: ShieldCheck,
      pains: ["No real-time spend insight", "Approval delays", "Limited accountability"],
      wins: ["Single dashboard for cost & fuel", "Approve from any device", "Transparent audit trail"],
    },
    {
      title: "Captains",
      icon: ShipWheel,
      pains: ["Manual reporting", "Fragmented crew coordination", "No live inventory"],
      wins: ["Daily ops in one platform", "Crew tasks and payroll visibility", "Instant provisioning status"],
    },
    {
      title: "Charter Operators",
      icon: Briefcase,
      pains: ["Profitability blind spots", "Non-standard compliance", "Slow client updates"],
      wins: ["Trip P&L and reports in seconds", "Documented compliance workflow", "Owner-ready reporting"],
    },
  ];

  const testimonials = useMemo(
    () => [
      { quote: "We cut approval time from two days to two hours.", name: "Charter Captain, 46m" },
      { quote: "Owners finally see the numbers in real time.", name: "Family Office Fleet Manager" },
      { quote: "Provisioning chaos disappeared in the first month.", name: "Chief Stewardess, Med Season" },
    ],
    []
  );
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <>
      <Head>
        <title>YachtOps | Yacht Operations Software for Owners & Captains</title>
        <meta
          name="description"
          content="YachtOps is the yacht operations software for real-time expense tracking, crew management, stock control, voyages, and compliance."
        />
        <meta name="keywords" content="yacht operations software, yacht expense tracking, charter yacht management system" />
      </Head>
      <style jsx global>{`
        ${testimonialKeyframes}
        .animate-testimonial {
          animation: testimonialFade 5s ease-in-out;
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600/90 p-2 text-white shadow-lg">
                <Anchor className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold">YachtOps</p>
                <p className="text-xs text-slate-500">Yacht Operations Platform</p>
              </div>
            </Link>
            <nav className="hidden gap-6 text-sm font-semibold text-slate-600 md:flex">
              <a href="#benefits" className="hover:text-slate-900">
                Benefits
              </a>
              <a href="#modules" className="hover:text-slate-900">
                Platform
              </a>
              <a href="#segments" className="hover:text-slate-900">
                Who it’s for
              </a>
              <a href="#demo" className="hover:text-slate-900">
                Demo
              </a>
            </nav>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="border-slate-300 text-sm font-semibold">
                <Link href="/auth/signin">Log in</Link>
              </Button>
              <Button asChild className="bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700">
                <Link href="#demo">Request a Demo</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="pb-24">
          {/* HERO */}
          <section className="border-b border-slate-200 bg-white py-16" id="hero">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:items-center">
              <div className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Yacht operations software</p>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Real-time cost and operations control for modern yachts.
                </h1>
                <p className="text-lg text-slate-600">
                  YachtOps unifies expenses, crew, stock, voyages, and compliance so owners, captains, and charter operators run
                  every day with clarity—and approve decisions instantly.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="h-12 rounded-xl bg-blue-600 px-8 text-base font-semibold text-white hover:bg-blue-700" asChild>
                    <Link href="#demo">Request a Demo</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl border-2 border-slate-300 px-8 text-base font-semibold text-slate-900 hover:bg-slate-100"
                    asChild
                  >
                    <Link href="#process">See How It Works</Link>
                  </Button>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Built for single vessels or multi-yacht fleets</li>
                  <li>• Owners, captains, and offices see the same live truth</li>
                  <li>• Replace spreadsheets, WhatsApp approvals, and scattered tools</li>
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-lg space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Client snapshot</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">Control every voyage in one screen</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Live spend, fuel, approvals, and crew tasks update the second the captain logs them.
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li>• Owners see fuel, spend, and voyage profitability before approving another euro.</li>
                  <li>• Captains log expenses, crew activity, and stock in less than a minute per entry.</li>
                  <li>• Offices run compliance, work orders, and documents without chasing email threads.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* TRUST */}
          <section className="border-b border-slate-200 bg-slate-900 py-14 text-white" id="trust">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4">
              <div className="max-w-3xl text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-blue-300">Trusted onboard</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Used daily by captains, yacht owners, and charter operators in Med & Caribbean seasons
                </h2>
              </div>
              <div className="w-full max-w-3xl">
                <div className="rounded-3xl border border-white/10 bg-white/5 px-10 py-12 text-center">
                  <blockquote
                    key={activeTestimonial}
                    className="text-xl font-semibold text-white animate-testimonial"
                  >
                    “{testimonials[activeTestimonial].quote}”
                    <footer className="mt-4 text-sm uppercase tracking-wide text-slate-300">
                      {testimonials[activeTestimonial].name}
                    </footer>
                  </blockquote>
                </div>
              </div>
            </div>
          </section>

          {/* BENEFITS */}
          <section className="bg-white py-20" id="benefits">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Core benefits</p>
                <h2 className="mt-3 text-3xl font-extrabold">Results captains can show and owners can trust.</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {benefitCards.map((card) => (
                  <div key={card.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="border-y border-slate-200 bg-slate-900 py-20 text-white" id="process">
            <div className="mx-auto max-w-6xl space-y-10 px-4">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200">How it works</p>
                <h2 className="mt-3 text-3xl font-extrabold">A simple flow that removes operational noise.</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-4">
                {processSteps.map((step, index) => (
                  <div key={step} className="rounded-3xl border border-white/20 bg-white/5 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-lg font-bold">
                      {index + 1}
                    </div>
                    <p className="mt-4 text-sm text-slate-200">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* MODULE OVERVIEW */}
          <section className="bg-white py-20" id="modules">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-600">System capabilities</p>
                <h2 className="mt-3 text-3xl font-extrabold">Every operational module stays in sync.</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div key={module.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold">{module.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{module.outcome}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* TARGET USERS */}
          <section className="border-y border-slate-200 bg-slate-50 py-20" id="segments">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-600">Who is this for?</p>
                <h2 className="mt-3 text-3xl font-extrabold">Designed for every decision-maker onboard and ashore.</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {segments.map((segment) => {
                  const Icon = segment.icon;
                  return (
                    <div key={segment.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Icon className="text-blue-600" />
                        <h3 className="text-lg font-semibold">{segment.title}</h3>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pain points</p>
                          <ul className="mt-2 space-y-1 text-slate-600">
                            {segment.pains.map((pain) => (
                              <li key={pain}>• {pain}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Benefits with YachtOps</p>
                          <ul className="mt-2 space-y-1 text-slate-600">
                            {segment.wins.map((win) => (
                              <li key={win}>• {win}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* DEMO FORM */}
          <section className="bg-white py-20" id="demo">
            <div className="mx-auto max-w-5xl space-y-10 px-4">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-600">See YachtOps live</p>
                <h2 className="mt-3 text-3xl font-extrabold">Request a walkthrough tailored to your vessel.</h2>
                <p className="mt-2 text-slate-600">No credit card required. A platform specialist replies within 1 business day.</p>
              </div>
              <form className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                      Full Name
                    </label>
                    <Input id="fullName" name="fullName" placeholder="Jane Carter" className="mt-2" required />
                  </div>
                  <div>
                    <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <Input id="email" name="email" type="email" placeholder="captain@yacht.com" className="mt-2" required />
                  </div>
                  <div>
                    <label htmlFor="yachtName" className="text-sm font-semibold text-slate-700">
                      Yacht Name
                    </label>
                    <Input id="yachtName" name="yachtName" placeholder="M/Y Horizon" className="mt-2" />
                  </div>
                  <div>
                    <label htmlFor="yachtLength" className="text-sm font-semibold text-slate-700">
                      Yacht Length (m)
                    </label>
                    <Input id="yachtLength" name="yachtLength" placeholder="52" className="mt-2" />
                  </div>
                  <div>
                    <label htmlFor="role" className="text-sm font-semibold text-slate-700">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option>Owner</option>
                      <option>Captain</option>
                      <option>Office</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">No credit card required. Free platform walkthrough.</p>
                  <Button className="h-12 rounded-xl bg-blue-600 px-8 text-base font-semibold text-white hover:bg-blue-700">
                    Request Demo
                  </Button>
                </div>
              </form>
            </div>
          </section>

          {/* PRICING TEASER */}
          <section className="border-y border-slate-200 bg-slate-900 py-16 text-white">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">pricing</p>
              <h2 className="text-3xl font-extrabold">Flexible pricing based on yacht size & fleet needs.</h2>
              <p className="text-slate-300">
                Single yachts, charter programs, and multi-vessel fleets receive tailored onboard + office access.
              </p>
              <Button className="rounded-xl bg-white px-8 font-semibold text-blue-600 hover:bg-blue-50" asChild>
                <Link href="#demo">Get Your Custom Price</Link>
              </Button>
            </div>
          </section>
        </main>

        <footer className="bg-slate-950 py-14 text-slate-300">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-600 p-2 text-white">
                  <Anchor className="h-5 w-5" />
                </div>
                <p className="text-lg font-bold text-white">YachtOps</p>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Yacht operations software for owners, captains, and charter operators who need real-time control.
              </p>
            </div>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-white">Contact</p>
              <a href="mailto:hello@yachtops.com" className="text-slate-400 hover:text-white">
                hello@yachtops.com
              </a>
              <p className="text-slate-500">Malta • Fort Lauderdale • Remote</p>
              <Link href="#demo" className="text-blue-300 hover:text-white">
                Request Demo
              </Link>
            </div>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-white">Legal</p>
              <Link href="/privacy" className="text-slate-400 hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-slate-400 hover:text-white">
                Terms of Service
              </Link>
              <p className="text-slate-500">© {new Date().getFullYear()} YachtOps</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
