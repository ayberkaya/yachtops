"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageSquare, Search, Tag } from "lucide-react";
import { battleCards, BattleCard } from "./battle-cards-data";
import { cn } from "@/lib/utils";

interface BattleCardsProps {
  presentationMode: boolean;
}

const categoryLabels: Record<BattleCard["category"], string> = {
  pricing: "Fiyatlandırma",
  features: "Özellikler",
  competition: "Rekabet",
  technical: "Teknik",
  general: "Genel",
};

const categoryColors: Record<BattleCard["category"], string> = {
  pricing: "bg-blue-100 text-blue-700 border-blue-200",
  features: "bg-green-100 text-green-700 border-green-200",
  competition: "bg-red-100 text-red-700 border-red-200",
  technical: "bg-purple-100 text-purple-700 border-purple-200",
  general: "bg-slate-100 text-slate-700 border-slate-200",
};

export function BattleCards({ presentationMode }: BattleCardsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BattleCard["category"] | "all">("all");

  const filteredCards = battleCards.filter((card) => {
    const matchesSearch =
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || card.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories: BattleCard["category"][] = ["pricing", "features", "competition", "technical", "general"];

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card className={cn(
        presentationMode && "shadow-xl border-2"
      )}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Soruları veya cevapları ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-10",
                  presentationMode && "h-12 text-lg"
                )}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  presentationMode && "h-10 px-4 text-base"
                )}
              >
                Tümü
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    presentationMode && "h-10 px-4 text-base"
                  )}
                >
                  {categoryLabels[category]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battle Cards List */}
      <div className="space-y-4">
        {filteredCards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className={cn(
                "text-slate-500",
                presentationMode && "text-lg"
              )}>
                Arama kriterlerinize uygun sonuç bulunamadı.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-3">
            {filteredCards.map((card, index) => (
              <Card
                key={index}
                className={cn(
                  "overflow-hidden",
                  presentationMode && "shadow-lg border-2"
                )}
              >
                <AccordionItem value={`card-${index}`} className="border-0">
                  <AccordionTrigger className={cn(
                    "px-6 py-4 hover:no-underline",
                    presentationMode && "px-8 py-6"
                  )}>
                    <div className="flex items-start gap-4 w-full text-left">
                      <div className={cn(
                        "p-2 rounded-lg bg-slate-100 flex-shrink-0",
                        presentationMode && "p-3"
                      )}>
                        <MessageSquare className={cn(
                          "w-5 h-5 text-slate-600",
                          presentationMode && "w-6 h-6"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-semibold text-slate-900 mb-2",
                          presentationMode ? "text-xl" : "text-base"
                        )}>
                          {card.question}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              categoryColors[card.category],
                              presentationMode && "text-sm px-3 py-1"
                            )}
                          >
                            {categoryLabels[card.category]}
                          </Badge>
                          {card.tags?.map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="outline"
                              className={cn(
                                "text-xs",
                                presentationMode && "text-sm"
                              )}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className={cn(
                    "px-6 pb-6",
                    presentationMode && "px-8 pb-8"
                  )}>
                    <div className={cn(
                      "pl-14 p-4 bg-slate-50 rounded-lg border border-slate-200",
                      presentationMode && "pl-16 p-6 text-base"
                    )}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={cn(
                          "p-2 rounded-lg bg-blue-100 flex-shrink-0",
                          presentationMode && "p-3"
                        )}>
                          <MessageSquare className={cn(
                            "w-4 h-4 text-blue-600",
                            presentationMode && "w-5 h-5"
                          )} />
                        </div>
                        <div>
                          <p className={cn(
                            "text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2",
                            presentationMode && "text-sm"
                          )}>
                            Satışçı İçin Cevap
                          </p>
                          <p className={cn(
                            "text-slate-700 leading-relaxed whitespace-pre-line",
                            presentationMode && "text-base"
                          )}>
                            {card.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}

