"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Edit, MoreVertical, Check, Users as UsersIcon, Target, MessageSquare, AlertCircle } from "lucide-react";

interface FeatureDeepDive {
  title: string;
  script: string;
  pain_point: string;
}

interface SalesMetadata {
  pitch?: string;
  ideal_customer?: string;
  features_deep_dive?: FeatureDeepDive[];
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  min_loa: number;
  max_loa: number | null;
  features: string[];
  activeSubscribers: number;
  status?: "active" | "archived";
  description?: string;
  sales_pitch?: string;
  sales_metadata?: SalesMetadata | string; // Can be JSONB string or parsed object
}

interface Subscriber {
  id: string;
  name: string | null;
  email: string;
}

interface PricingTableProps {
  plans: Plan[];
  subscribersByPlan: Record<string, Subscriber[]>;
}

export function PricingTable({ plans, subscribersByPlan }: PricingTableProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return "Custom";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatLOA = (min: number, max: number | null) => {
    if (max === null) return `${min}m+`;
    if (min === 0 && max) return `Up to ${max}m`;
    return `${min}-${max}m`;
  };

  const handleRowClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsSheetOpen(true);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const parseSalesMetadata = (metadata: SalesMetadata | string | undefined): SalesMetadata | null => {
    if (!metadata) return null;
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch {
        return null;
      }
    }
    return metadata;
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-slate-900">Plan Name</TableHead>
              <TableHead className="font-semibold text-slate-900">Price</TableHead>
              <TableHead className="font-semibold text-slate-900">Vessel Limits</TableHead>
              <TableHead className="font-semibold text-slate-900">Features</TableHead>
              <TableHead className="font-semibold text-slate-900">Active Subscribers</TableHead>
              <TableHead className="font-semibold text-slate-900">Status</TableHead>
              <TableHead className="font-semibold text-slate-900 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  No plans found. Create your first plan to get started.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => {
                const subscribers = subscribersByPlan[plan.id] || [];
                const subscriberCount = plan.activeSubscribers || subscribers.length;

                return (
                  <TableRow
                    key={plan.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleRowClick(plan)}
                  >
                    <TableCell>
                      <span className="font-semibold text-slate-900">{plan.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">
                        {formatPrice(plan.price, plan.currency)}
                        {plan.price > 0 && <span className="text-slate-500 text-sm">/mo</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">{formatLOA(plan.min_loa, plan.max_loa)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">
                        {plan.features.length} {plan.features.length === 1 ? "Feature" : "Features"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${
                          subscriberCount === 0
                            ? "text-slate-400"
                            : "text-slate-700"
                        }`}
                      >
                        {subscriberCount} {subscriberCount === 1 ? "User" : "Users"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={plan.status === "active" ? "default" : "secondary"}
                        className={
                          plan.status === "active"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-slate-200 text-slate-700 border-slate-300"
                        }
                      >
                        {plan.status === "active" ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRowClick(plan)}>
                            <Edit className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sales Battle Card Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedPlan && (() => {
            const salesMetadata = parseSalesMetadata(selectedPlan.sales_metadata);
            const pitch = salesMetadata?.pitch || selectedPlan.description || selectedPlan.sales_pitch;
            const idealCustomer = salesMetadata?.ideal_customer;
            const featuresDeepDive = salesMetadata?.features_deep_dive || [];

            return (
              <>
                <SheetHeader className="pb-6 border-b border-slate-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-3xl font-bold text-slate-900">
                        {selectedPlan.name} - Sales Battle Card
                      </SheetTitle>
                      <Badge
                        variant={selectedPlan.status === "active" ? "default" : "secondary"}
                        className={
                          selectedPlan.status === "active"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-slate-200 text-slate-700 border-slate-300"
                        }
                      >
                        {selectedPlan.status === "active" ? "Active" : "Archived"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900">
                        {formatPrice(selectedPlan.price, selectedPlan.currency)}
                      </span>
                      {selectedPlan.price > 0 && (
                        <span className="text-lg text-slate-500">/month</span>
                      )}
                    </div>
                    <SheetDescription className="text-slate-600">
                      Vessel Length: {formatLOA(selectedPlan.min_loa, selectedPlan.max_loa)}
                    </SheetDescription>
                  </div>
                </SheetHeader>

                <div className="flex flex-col gap-6 px-6 pt-6 pb-6">
                  {/* Sales Pitch Section - Highlighted */}
                  {pitch && (
                    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-lg">
                      <div className="flex items-start gap-3 mb-3">
                        <MessageSquare className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                        <h3 className="text-lg font-bold text-white">Sales Pitch</h3>
                      </div>
                      <p className="text-base text-slate-100 leading-relaxed">{pitch}</p>
                    </div>
                  )}

                  {/* Ideal Customer Section */}
                  {idealCustomer && (
                    <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-start gap-3 mb-3">
                        <Target className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                        <h3 className="text-base font-semibold text-slate-900">Ideal Customer</h3>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{idealCustomer}</p>
                    </div>
                  )}

                  <Separator className="my-2" />

                  {/* Features Deep Dive with Accordion */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Features Deep Dive
                    </h3>
                    {featuresDeepDive.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {featuresDeepDive.map((feature, index) => (
                          <AccordionItem key={index} value={`feature-${index}`} className="border-slate-200">
                            <AccordionTrigger className="text-left hover:no-underline">
                              <div className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="font-medium text-slate-900">{feature.title}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-4">
                              <div className="space-y-4 pl-8">
                                {/* What to Say */}
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="w-4 h-4 text-slate-600" />
                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                      What to Say
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-700 leading-relaxed">{feature.script}</p>
                                </div>

                                {/* Pain Point Solved */}
                                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                                      Problem Solved
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-700 leading-relaxed">{feature.pain_point}</p>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      // Fallback to simple feature list if no deep dive data
                      <div className="space-y-3">
                        {selectedPlan.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                            <span className="text-sm text-slate-700 leading-relaxed">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator className="my-2" />

                  {/* Current Subscribers */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <UsersIcon className="w-5 h-5 text-slate-600" />
                      <h3 className="text-base font-semibold text-slate-900">
                        Current Subscribers ({subscribersByPlan[selectedPlan.id]?.length || 0})
                      </h3>
                    </div>
                    {subscribersByPlan[selectedPlan.id] && subscribersByPlan[selectedPlan.id].length > 0 ? (
                      <div className="space-y-3">
                        {subscribersByPlan[selectedPlan.id].map((subscriber) => (
                          <div
                            key={subscriber.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <Avatar className="h-10 w-10 border-2 border-slate-300">
                              <AvatarFallback className="bg-slate-200 text-slate-700 font-semibold">
                                {getInitials(subscriber.name, subscriber.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {subscriber.name || "Unnamed User"}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{subscriber.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No active subscribers on this plan.</p>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );
}

