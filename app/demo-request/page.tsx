import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DemoRequestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Request a Demo</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">See HelmOps in Action</h1>
          <p className="text-slate-600">
            Tell us about your vessel and workflows. We will tailor a live demo to your needs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Share your details</CardTitle>
            <CardDescription>We respond within one business day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Full name" />
            <Input placeholder="Work email" type="email" />
            <Input placeholder="Vessel / Company" />
            <Input placeholder="Fleet size (optional)" />
            <Textarea placeholder="What would you like to see in the demo?" rows={4} />
            <div className="flex gap-3">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">Submit demo request</Button>
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

