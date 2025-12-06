import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function FleetSolutionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Fleet Solutions</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Tailored for multi-vessel operations</h1>
          <p className="text-slate-600">
            Share your fleet needs—centralized oversight, role-based access, and custom workflows for owners and managers.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tell us about your fleet</CardTitle>
            <CardDescription>We will propose a setup that fits your operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Full name" />
            <Input placeholder="Work email" type="email" />
            <Input placeholder="Company / Fleet name" />
            <Input placeholder="Number of vessels" />
            <Textarea placeholder="What problems are you solving? (permissions, reporting, workflows, etc.)" rows={4} />
            <div className="flex gap-3">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">Send request</Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

