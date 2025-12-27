"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Presentation, Settings } from "lucide-react";
import { PlansMatrix } from "./plans-matrix";
import { ROICalculator } from "./roi-calculator";
import { BattleCards } from "./battle-cards";
import { Assets } from "./assets";

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

interface SalesHubProps {
  plans: PlanData[];
}

export function SalesHub({ plans }: SalesHubProps) {
  const [presentationMode, setPresentationMode] = useState(false);
  const [activeTab, setActiveTab] = useState("plans");

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Presentation Mode Toggle */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Sales Hub</h1>
          <p className="text-slate-600 text-lg">
            Müşteri sunumları ve satış süreçleri için tüm araçlar
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <Presentation className={`w-5 h-5 ${presentationMode ? "text-primary" : "text-slate-400"}`} />
            <div className="flex items-center gap-2">
              <Label htmlFor="presentation-mode" className="text-sm font-medium text-slate-700 cursor-pointer">
                Sunum Modu
              </Label>
              <Switch
                id="presentation-mode"
                checked={presentationMode}
                onCheckedChange={setPresentationMode}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 bg-slate-50">
          <TabsTrigger value="plans" className="text-base font-medium">
            Planlar & Matris
          </TabsTrigger>
          <TabsTrigger value="calculator" className="text-base font-medium">
            ROI Hesaplayıcı
          </TabsTrigger>
          <TabsTrigger value="battle-cards" className="text-base font-medium">
            İtiraz Karşılama
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-base font-medium">
            Kaynaklar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
          <PlansMatrix plans={plans} presentationMode={presentationMode} />
        </TabsContent>

        <TabsContent value="calculator" className="mt-6">
          <ROICalculator plans={plans} presentationMode={presentationMode} />
        </TabsContent>

        <TabsContent value="battle-cards" className="mt-6">
          <BattleCards presentationMode={presentationMode} />
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <Assets presentationMode={presentationMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

