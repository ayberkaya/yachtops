"use client";

import Link from "next/link";
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
import { useActionState, useEffect, useState, startTransition } from "react";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { Mail, MapPin } from "lucide-react";
import { submitLead, type SubmitLeadState } from "@/actions/submit-lead";

export default function ContactPage() {
  const { toast, toasts, removeToast } = useToast();
  
  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    subject: string;
    message: string;
  }>({
    full_name: "",
    email: "",
    subject: "",
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
          title: "Message Sent",
          description: "We'll get back to you shortly.",
          variant: "success",
        });
        // Reset form on success
        setFormData({
          full_name: "",
          email: "",
          subject: "",
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
    formDataObj.append("email", formData.email || "");
    formDataObj.append("subject", formData.subject || "");
    formDataObj.append("message", formData.message || "");
    // Note: We intentionally do NOT send role or vessel_size
    // This will make the server action tag it as 'CONTACT_INQUIRY'
    startTransition(() => {
      formAction(formDataObj);
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Get in Touch
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            For general inquiries, partnerships, or press.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left Column: Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Contact Concierge
              </h2>
              <p className="text-slate-600 leading-relaxed mb-8">
                Our support team is available to assist with technical questions or partnership opportunities.
              </p>
            </div>

            <div className="space-y-6">
              {/* Email */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-900">Email</span>
                </div>
                <a
                  href="mailto:support@helmops.com"
                  className="text-slate-900 underline decoration-slate-300 hover:decoration-[#C5A059] transition-colors text-lg"
                >
                  support@helmops.com
                </a>
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-900">Location</span>
                </div>
                <p className="text-slate-600">
                  Headquarters: İzmir, Türkiye
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-sm"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                  Work Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email ?? ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-sm"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-900 mb-2">
                  Subject
                </label>
                <Select
                  required
                  value={formData.subject || undefined}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger className="w-full h-11 bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-sm">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                    <SelectItem value="Partnership Opportunity">Partnership Opportunity</SelectItem>
                    <SelectItem value="Press Inquiry">Press Inquiry</SelectItem>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Sales & Pricing">Sales & Pricing</SelectItem>
                    <SelectItem value="Feature Request">Feature Request</SelectItem>
                    <SelectItem value="Bug Report">Bug Report</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-900 mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  required
                  value={formData.message ?? ""}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-white border-stone-200 focus:border-slate-900 focus:ring-slate-900 min-h-[140px] rounded-sm"
                  placeholder="How can we help?"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-8 py-6 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Sending..." : "Send Message"}
                </Button>
                <Link 
                  href="/"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors underline decoration-slate-300 hover:decoration-slate-900"
                >
                  Back to home
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
