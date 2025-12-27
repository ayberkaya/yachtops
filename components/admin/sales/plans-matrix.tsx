"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Edit, Trash2, Sparkles, Users, HardDrive, Ship, Calendar } from "lucide-react";
import { PlanEditorSheet } from "@/components/admin/pricing/plan-editor-sheet";
import { Plan } from "@/components/admin/pricing/plan-card";
import { useState } from "react";
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

interface PlansMatrixProps {
  plans: PlanData[];
  presentationMode: boolean;
}

export function PlansMatrix({ plans, presentationMode }: PlansMatrixProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Get all unique features across all plans
  const allFeatures = Array.from(
    new Set(plans.flatMap((plan) => plan.features || []))
  ).sort();

  const formatPrice = (price: number | null | undefined, currency: string) => {
    if (price === 0 || price === null || price === undefined) return "Özel Fiyat";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatLOA = (min: number, max: number | null) => {
    if (max === null) return `${min}m+`;
    if (min === 0 && max) return `${max}m'ye kadar`;
    return `${min}-${max}m`;
  };

  const hasFeature = (plan: PlanData, feature: string) => {
    return plan.features?.includes(feature) || false;
  };

  const activePlans = plans.filter((p) => p.status !== "archived");

  return (
    <div className="space-y-8">
      {/* Plans Grid View */}
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        presentationMode && "gap-8"
      )}>
        {activePlans.map((plan) => {
          const displayPrice = plan.monthly_price ?? plan.price;
          const isCustom = displayPrice === 0 || displayPrice === null;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-all hover:shadow-lg",
                plan.is_popular && "ring-2 ring-primary ring-offset-2",
                presentationMode && "shadow-xl border-2"
              )}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-lg">
                    <Sparkles className="mr-1 h-3 w-3" />
                    En Popüler
                  </Badge>
                </div>
              )}

              <CardHeader className={cn("pb-4", presentationMode && "pb-6")}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={cn(
                      "font-bold text-slate-900",
                      presentationMode ? "text-3xl mb-3" : "text-2xl"
                    )}>
                      {plan.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className={cn(
                        "font-bold text-slate-900",
                        presentationMode ? "text-5xl" : "text-4xl"
                      )}>
                        {formatPrice(displayPrice, plan.currency)}
                      </span>
                      {!isCustom && (
                        <span className={cn(
                          "text-slate-500",
                          presentationMode ? "text-xl" : "text-base"
                        )}>
                          /ay
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-slate-600 mt-2",
                      presentationMode ? "text-base" : "text-sm"
                    )}>
                      {formatLOA(plan.min_loa, plan.max_loa)} yatlar için
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                {plan.description && (
                  <p className={cn(
                    "text-slate-600 italic",
                    presentationMode ? "text-base" : "text-sm"
                  )}>
                    {plan.description}
                  </p>
                )}

                {/* Annual Price Info */}
                {plan.yearly_price && plan.yearly_price > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-slate-600",
                        presentationMode ? "text-sm" : "text-xs"
                      )}>
                        Yıllık Ödeme:
                      </span>
                      <span className={cn(
                        "font-semibold text-slate-900",
                        presentationMode ? "text-lg" : "text-base"
                      )}>
                        {formatPrice(plan.yearly_price, plan.currency)}/yıl
                      </span>
                    </div>
                    {plan.monthly_price && plan.monthly_price > 0 && (() => {
                      const monthlyTotal = plan.monthly_price * 12;
                      const savings = monthlyTotal - plan.yearly_price;
                      if (savings > 0) {
                        return (
                          <p className={cn(
                            "text-green-600 font-medium mt-1",
                            presentationMode ? "text-xs" : "text-[10px]"
                          )}>
                            (Aylık ödemeye göre {formatPrice(savings, plan.currency)} tasarruf)
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Limits Section */}
                {plan.limits && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <p className={cn(
                      "font-semibold text-slate-900 mb-2",
                      presentationMode ? "text-base" : "text-sm"
                    )}>
                      Limitler
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {/* Support both maxUsers (camelCase) and max_users (snake_case) */}
                      {((plan.limits as any).maxUsers !== undefined && (plan.limits as any).maxUsers !== null) ||
                       ((plan.limits as any).max_users !== undefined && (plan.limits as any).max_users !== null) ? (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Users className={cn(
                            "text-primary flex-shrink-0",
                            presentationMode ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          <span className={cn(
                            presentationMode ? "text-base" : "text-sm"
                          )}>
                            Maksimum Kullanıcı: <strong>
                              {(() => {
                                const maxUsers = (plan.limits as any).maxUsers ?? (plan.limits as any).max_users;
                                return maxUsers === 9999 || maxUsers >= 999 ? "Sınırsız" : maxUsers;
                              })()}
                            </strong>
                          </span>
                        </div>
                      ) : null}
                      {/* Support both maxStorage/storage_mb */}
                      {((plan.limits as any).maxStorage !== undefined && (plan.limits as any).maxStorage !== null) ||
                       ((plan.limits as any).storage_mb !== undefined && (plan.limits as any).storage_mb !== null) ? (
                        <div className="flex items-center gap-2 text-slate-700">
                          <HardDrive className={cn(
                            "text-primary flex-shrink-0",
                            presentationMode ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          <span className={cn(
                            presentationMode ? "text-base" : "text-sm"
                          )}>
                            Depolama: <strong>
                              {(() => {
                                const storage = (plan.limits as any).maxStorage ?? (plan.limits as any).storage_mb;
                                // If storage is in MB, convert to GB/TB
                                if (storage >= 1024 * 1024) {
                                  return `${(storage / (1024 * 1024)).toFixed(storage % (1024 * 1024) === 0 ? 0 : 1)} TB`;
                                } else if (storage >= 1024) {
                                  return `${(storage / 1024).toFixed(storage % 1024 === 0 ? 0 : 1)} GB`;
                                } else {
                                  return `${storage} MB`;
                                }
                              })()}
                            </strong>
                          </span>
                        </div>
                      ) : null}
                      {/* Support both maxVessels/max_vessels */}
                      {((plan.limits as any).maxVessels !== undefined && (plan.limits as any).maxVessels !== null) ||
                       ((plan.limits as any).max_vessels !== undefined && (plan.limits as any).max_vessels !== null) ? (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Ship className={cn(
                            "text-primary flex-shrink-0",
                            presentationMode ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          <span className={cn(
                            presentationMode ? "text-base" : "text-sm"
                          )}>
                            Maksimum Tekne: <strong>
                              {(() => {
                                const maxVessels = (plan.limits as any).maxVessels ?? (plan.limits as any).max_vessels;
                                return maxVessels === 999 || maxVessels >= 999 ? "Sınırsız" : maxVessels;
                              })()}
                            </strong>
                          </span>
                        </div>
                      ) : null}
                      {/* Support maxCrewMembers */}
                      {(plan.limits as any).maxCrewMembers !== undefined && (plan.limits as any).maxCrewMembers !== null && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Users className={cn(
                            "text-primary flex-shrink-0",
                            presentationMode ? "h-5 w-5" : "h-4 w-4"
                          )} />
                          <span className={cn(
                            presentationMode ? "text-base" : "text-sm"
                          )}>
                            Maksimum Mürettebat: <strong>{(plan.limits as any).maxCrewMembers}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <p className={cn(
                    "font-semibold text-slate-900 mb-2",
                    presentationMode ? "text-base" : "text-sm"
                  )}>
                    Özellikler
                  </p>
                  {(plan.features || []).slice(0, 6).map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className={cn(
                        "text-primary mt-0.5 flex-shrink-0",
                        presentationMode ? "h-5 w-5" : "h-4 w-4"
                      )} />
                      <span className={cn(
                        "text-slate-700",
                        presentationMode ? "text-base" : "text-sm"
                      )}>
                        {feature}
                      </span>
                    </div>
                  ))}
                  {(plan.features || []).length > 6 && (
                    <p className={cn(
                      "text-muted-foreground pt-1",
                      presentationMode ? "text-sm" : "text-xs"
                    )}>
                      +{plan.features.length - 6} özellik daha
                    </p>
                  )}
                </div>

                {/* Active Subscribers */}
                {plan.activeSubscribers !== undefined && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className={cn(
                        "text-slate-400 flex-shrink-0",
                        presentationMode ? "h-4 w-4" : "h-3 w-3"
                      )} />
                      <span className={cn(
                        presentationMode ? "text-sm" : "text-xs"
                      )}>
                        <strong>{plan.activeSubscribers}</strong> aktif abone
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons - Hidden in Presentation Mode */}
                {!presentationMode && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => {
                      setSelectedPlan({
                        id: plan.id,
                        name: plan.name,
                        price: plan.price,
                        monthly_price: plan.monthly_price,
                        yearly_price: plan.yearly_price,
                        currency: plan.currency,
                        features: plan.features,
                        activeSubscribers: plan.activeSubscribers,
                        status: plan.status,
                        description: plan.description,
                        isPopular: plan.is_popular,
                        tier: plan.tier,
                        limits: plan.limits,
                      });
                      setIsEditorOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Düzenle
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      {allFeatures.length > 0 && (
        <Card className={cn(
          presentationMode && "shadow-xl border-2"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              presentationMode ? "text-2xl" : "text-xl"
            )}>
              Özellik Karşılaştırma Matrisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(
                      "font-semibold text-slate-900",
                      presentationMode && "text-base"
                    )}>
                      Özellik
                    </TableHead>
                    {activePlans.map((plan) => (
                      <TableHead
                        key={plan.id}
                        className={cn(
                          "font-semibold text-slate-900 text-center",
                          presentationMode && "text-base"
                        )}
                      >
                        {plan.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFeatures.map((feature) => (
                    <TableRow key={feature}>
                      <TableCell className={cn(
                        "font-medium",
                        presentationMode && "text-base"
                      )}>
                        {feature}
                      </TableCell>
                      {activePlans.map((plan) => (
                        <TableCell key={plan.id} className="text-center">
                          {hasFeature(plan, feature) ? (
                            <Check className={cn(
                              "h-5 w-5 text-primary mx-auto",
                              presentationMode && "h-6 w-6"
                            )} />
                          ) : (
                            <X className={cn(
                              "h-5 w-5 text-slate-300 mx-auto",
                              presentationMode && "h-6 w-6"
                            )} />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Editor Sheet */}
      {selectedPlan && (
        <PlanEditorSheet
          plan={selectedPlan}
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          onSuccess={() => {
            setIsEditorOpen(false);
            // Refresh would be handled by parent
          }}
        />
      )}
    </div>
  );
}

