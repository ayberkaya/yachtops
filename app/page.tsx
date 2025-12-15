"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Anchor } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white via-blue-50/30 to-white p-4">
      <div className="max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg mb-4">
          <Anchor className="text-white w-8 h-8" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">HelmOps</p>
        <h1 className="text-4xl font-bold text-slate-900">Yacht Operations Management</h1>
        <p className="text-lg text-slate-600">
          Track expenses, manage tasks, and run your yacht operations efficiently
        </p>
        <div className="pt-4">
          <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
