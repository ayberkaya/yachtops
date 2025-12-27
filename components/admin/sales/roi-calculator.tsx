"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanData {
  id: string;
  name: string;
  price: number;
  monthly_price?: number | null;
  yearly_price?: number | null;
  currency: string;
  min_loa: number;
  max_loa: number | null;
  features: string[];
  activeSubscribers: number;
  status?: "active" | "archived";
  description?: string;
  sales_pitch?: string;
  sales_metadata?: any;
  is_popular?: boolean;
  tier?: number;
  limits?: {
    maxUsers?: number;
    maxStorage?: number;
    maxGuests?: number;
    maxCrewMembers?: number;
  } | null;
}

interface ROICalculatorProps {
  plans: PlanData[];
  presentationMode: boolean;
}

export function ROICalculator({ plans, presentationMode }: ROICalculatorProps) {
  const [yachtCount, setYachtCount] = useState(1);
  const [crewCount, setCrewCount] = useState(5);
  const [monthlySpending, setMonthlySpending] = useState(5000);
  const [currentSystemCost, setCurrentSystemCost] = useState(0);
  const [timeSavedHours, setTimeSavedHours] = useState(10);

  // Calculate which plan is best fit
  const recommendation = useMemo(() => {
    // Simple logic: based on yacht count and LOA
    // In real scenario, this would be more sophisticated
    const activePlans = plans.filter((p) => p.status !== "archived").sort((a, b) => (a.tier || 0) - (b.tier || 0));
    
    // Estimate LOA based on crew count (rough heuristic: 1 crew per 5-7m)
    const estimatedLOA = crewCount * 6;
    
    // Find best matching plan
    let bestPlan = activePlans[0];
    for (const plan of activePlans) {
      if (estimatedLOA >= plan.min_loa && (plan.max_loa === null || estimatedLOA <= plan.max_loa)) {
        bestPlan = plan;
        break;
      }
    }
    
    // If no match, use highest tier
    if (!bestPlan) {
      bestPlan = activePlans[activePlans.length - 1];
    }

    const monthlyPrice = bestPlan.monthly_price ?? bestPlan.price ?? 0;
    const yearlyPrice = bestPlan.yearly_price ?? monthlyPrice * 12;
    
    // Calculate savings
    // Assumptions:
    // - Time saved = efficiency gain
    // - Average crew hourly cost = $50/hour
    // - Current system cost (if provided)
    const hourlyCrewCost = 50; // Can be made configurable
    const monthlyTimeSavings = timeSavedHours * hourlyCrewCost * yachtCount;
    const currentSystemMonthly = currentSystemCost / 12;
    const monthlySavings = monthlyTimeSavings - monthlyPrice - (currentSystemMonthly || 0);
    const yearlySavings = monthlySavings * 12;
    const roiPercentage = currentSystemCost > 0 
      ? ((yearlySavings / currentSystemCost) * 100)
      : ((yearlySavings / yearlyPrice) * 100);

    return {
      plan: bestPlan,
      monthlyPrice,
      yearlyPrice,
      monthlySavings,
      yearlySavings,
      roiPercentage,
      monthlyTimeSavings,
    };
  }, [yachtCount, crewCount, monthlySpending, currentSystemCost, timeSavedHours, plans]);

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className={cn(
          presentationMode && "shadow-xl border-2"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2",
              presentationMode && "text-2xl"
            )}>
              <Calculator className="w-5 h-5" />
              Müşteri Bilgileri
            </CardTitle>
            <CardDescription className={cn(
              presentationMode && "text-base"
            )}>
              Müşteri detaylarını girerek en uygun paketi hesaplayın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="yacht-count" className={cn(
                presentationMode && "text-base"
              )}>
                Yat Sayısı
              </Label>
              <Input
                id="yacht-count"
                type="number"
                min="1"
                value={yachtCount}
                onChange={(e) => setYachtCount(Math.max(1, parseInt(e.target.value) || 1))}
                className={cn(
                  presentationMode && "h-12 text-lg"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="crew-count" className={cn(
                presentationMode && "text-base"
              )}>
                Ortalama Mürettebat Sayısı (Yat Başına)
              </Label>
              <Input
                id="crew-count"
                type="number"
                min="1"
                value={crewCount}
                onChange={(e) => setCrewCount(Math.max(1, parseInt(e.target.value) || 1))}
                className={cn(
                  presentationMode && "h-12 text-lg"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-spending" className={cn(
                presentationMode && "text-base"
              )}>
                Aylık Ortalama Harcama ({recommendation.plan.currency})
              </Label>
              <Input
                id="monthly-spending"
                type="number"
                min="0"
                value={monthlySpending}
                onChange={(e) => setMonthlySpending(Math.max(0, parseFloat(e.target.value) || 0))}
                className={cn(
                  presentationMode && "h-12 text-lg"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-system-cost" className={cn(
                presentationMode && "text-base"
              )}>
                Mevcut Sistem Yıllık Maliyeti ({recommendation.plan.currency}) (Opsiyonel)
              </Label>
              <Input
                id="current-system-cost"
                type="number"
                min="0"
                value={currentSystemCost}
                onChange={(e) => setCurrentSystemCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className={cn(
                  presentationMode && "h-12 text-lg"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-saved" className={cn(
                presentationMode && "text-base"
              )}>
                Aylık Tasarruf Edilen Saat (Yat Başına)
              </Label>
              <Input
                id="time-saved"
                type="number"
                min="0"
                value={timeSavedHours}
                onChange={(e) => setTimeSavedHours(Math.max(0, parseFloat(e.target.value) || 0))}
                className={cn(
                  presentationMode && "h-12 text-lg"
                )}
              />
              <p className={cn(
                "text-xs text-muted-foreground",
                presentationMode && "text-sm"
              )}>
                Sistemimizin sağladığı verimlilik artışı
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className={cn(
          "bg-gradient-to-br from-slate-900 to-slate-800 text-white",
          presentationMode && "shadow-xl border-2"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2 text-white",
              presentationMode && "text-2xl"
            )}>
              <TrendingUp className="w-5 h-5" />
              Hesaplama Sonuçları
            </CardTitle>
            <CardDescription className={cn(
              "text-slate-300",
              presentationMode && "text-base"
            )}>
              Önerilen paket ve tasarruf analizi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recommended Plan */}
            <div className="p-4 bg-white/10 rounded-lg border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-slate-300",
                  presentationMode && "text-base"
                )}>
                  Önerilen Paket
                </span>
                {recommendation.plan.is_popular && (
                  <Badge className="bg-primary text-primary-foreground">
                    En Popüler
                  </Badge>
                )}
              </div>
              <h3 className={cn(
                "font-bold text-white mb-1",
                presentationMode ? "text-2xl" : "text-xl"
              )}>
                {recommendation.plan.name}
              </h3>
              <p className={cn(
                "text-slate-300",
                presentationMode && "text-base"
              )}>
                {formatCurrency(recommendation.monthlyPrice, recommendation.plan.currency)}/ay
                {" "}veya {formatCurrency(recommendation.yearlyPrice, recommendation.plan.currency)}/yıl
              </p>
            </div>

            {/* Savings */}
            <div className="space-y-4">
              <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className={cn(
                    "text-green-300 font-medium",
                    presentationMode && "text-base"
                  )}>
                    Aylık Tasarruf
                  </span>
                </div>
                <p className={cn(
                  "text-green-100 font-bold",
                  presentationMode ? "text-3xl" : "text-2xl"
                )}>
                  {formatCurrency(recommendation.monthlySavings, recommendation.plan.currency)}
                </p>
              </div>

              <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <span className={cn(
                    "text-blue-300 font-medium",
                    presentationMode && "text-base"
                  )}>
                    Yıllık Tasarruf
                  </span>
                </div>
                <p className={cn(
                  "text-blue-100 font-bold",
                  presentationMode ? "text-3xl" : "text-2xl"
                )}>
                  {formatCurrency(recommendation.yearlySavings, recommendation.plan.currency)}
                </p>
              </div>

              {recommendation.roiPercentage > 0 && (
                <div className="p-4 bg-purple-500/20 rounded-lg border border-purple-400/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-purple-400" />
                    <span className={cn(
                      "text-purple-300 font-medium",
                      presentationMode && "text-base"
                    )}>
                      ROI
                    </span>
                  </div>
                  <p className={cn(
                    "text-purple-100 font-bold",
                    presentationMode ? "text-3xl" : "text-2xl"
                  )}>
                    %{recommendation.roiPercentage.toFixed(0)}
                  </p>
                </div>
              )}
            </div>

            {/* Key Benefits */}
            <div className="pt-4 border-t border-white/20">
              <h4 className={cn(
                "font-semibold mb-3 text-white",
                presentationMode && "text-lg"
              )}>
                Paket Özellikleri
              </h4>
              <ul className="space-y-2">
                {recommendation.plan.features.slice(0, 5).map((feature, index) => (
                  <li key={index} className={cn(
                    "text-slate-300 flex items-start gap-2",
                    presentationMode && "text-base"
                  )}>
                    <span className="text-green-400 mt-1">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

