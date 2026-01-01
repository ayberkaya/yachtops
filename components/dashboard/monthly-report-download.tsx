"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, FileText, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SECTION_OPTIONS = [
  {
    id: "summary",
    label: "Executive Summary",
    description: "Comprehensive overview with key performance indicators, total expenses, trip statistics, task completion rates, and operational efficiency metrics.",
    icon: "📊",
  },
  {
    id: "financial",
    label: "Financial Analysis",
    description: "Detailed expense breakdown by category and currency, transaction summaries, spending trends, and financial insights with comparative analysis.",
    icon: "💰",
  },
  {
    id: "trips",
    label: "Voyage Report",
    description: "Complete trip documentation including departure/arrival ports, dates, durations, status, crew assignments, and voyage-specific expenses.",
    icon: "⚓",
  },
  {
    id: "tasks",
    label: "Maintenance & Tasks",
    description: "All completed maintenance tasks, operational assignments, completion dates, assignees, task categories, and maintenance schedules.",
    icon: "🔧",
  },
  {
    id: "shopping",
    label: "Procurement Activity",
    description: "Shopping list completions, item counts, procurement timelines, vendor information, and inventory replenishment statistics.",
    icon: "🛒",
  },
] as const;

export function MonthlyReportDownload() {
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateRange, setDateRange] = useState(() => ({
    start: format(defaultStart, "yyyy-MM-dd"),
    end: format(today, "yyyy-MM-dd"),
  }));
  const [selectedSections, setSelectedSections] = useState<string[]>(
    SECTION_OPTIONS.map((option) => option.id)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const isRangeValid = useMemo(() => {
    if (!dateRange.start || !dateRange.end) {
      return false;
    }
    return new Date(dateRange.start) <= new Date(dateRange.end);
  }, [dateRange.end, dateRange.start]);

  const sanitizeDateForFilename = (value: string) => value.replace(/-/g, "");

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleDownload = async () => {
    if (!isRangeValid) {
      alert("Please choose a valid date range.");
      return;
    }

    if (selectedSections.length === 0) {
      alert("Select at least one section to include in the report.");
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams();
      params.set("start", dateRange.start);
      params.set("end", dateRange.end);
      selectedSections.forEach((section) => params.append("sections", section));

      const response = await fetch(`/api/reports/monthly?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to generate report");
      }

      const blob = await response.blob();

      if (blob.type !== "application/pdf" && blob.size === 0) {
        throw new Error("Invalid PDF response");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `operations-report-${sanitizeDateForFilename(dateRange.start)}-${sanitizeDateForFilename(dateRange.end)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading report:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate report. Please try again.";
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Collapsible open={isPanelOpen} onOpenChange={setIsPanelOpen} className="w-full">
      <Card>
        <CardHeader className="pb-0">
          <CollapsibleTrigger className="w-full">
            <div className="flex w-full items-start gap-3 rounded-xl px-0 py-1 text-left transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base font-semibold">Operations Report</CardTitle>
                </div>
                <CardDescription>
                  Generate a comprehensive, premium PDF report with detailed analytics, yacht branding, and professional formatting for captains and owners.
                </CardDescription>
              </div>
              <ChevronDown
                className={`mt-1 h-4 w-4 shrink-0 transition-transform ${
                  isPanelOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Start date</label>
            <Input
              type="date"
              value={dateRange.start}
              max={dateRange.end}
              onChange={(event) =>
                setDateRange((prev) => ({
                  ...prev,
                  start: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End date</label>
            <Input
              type="date"
              value={dateRange.end}
              min={dateRange.start}
              max={format(today, "yyyy-MM-dd")}
              onChange={(event) =>
                setDateRange((prev) => ({
                  ...prev,
                  end: event.target.value,
                }))
              }
            />
          </div>
        </div>

        {!isRangeValid && (
          <p className="text-xs text-destructive">
            Start date must be before or equal to the end date.
          </p>
        )}

        <div>
          <div className="mb-3 flex items-center gap-2">
            <p className="text-sm font-semibold">Report Sections</p>
            <Badge variant="secondary" className="text-xs">
              {selectedSections.length} selected
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Customize your report by selecting the sections you need. Each section includes detailed analytics and comprehensive data.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {SECTION_OPTIONS.map((option) => {
              const checked = selectedSections.includes(option.id);
              return (
                <label
                  key={option.id}
                  htmlFor={`section-${option.id}`}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-all cursor-pointer ${
                    checked
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
                  }`}
                >
                  <Checkbox
                    id={`section-${option.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleSection(option.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{option.icon}</span>
                      <p className="text-sm font-semibold leading-tight">{option.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedSections.length === 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
              <Info className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">
                Please select at least one section to generate the report.
              </p>
            </div>
          )}
        </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t">
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  Report Preview
                </p>
                <p className="text-xs text-muted-foreground">
                  Your PDF will include {selectedSections.length} section{selectedSections.length !== 1 ? "s" : ""} covering the period from {dateRange.start ? format(new Date(dateRange.start), "MMM d, yyyy") : "..."} to {dateRange.end ? format(new Date(dateRange.end), "MMM d, yyyy") : "..."}. The report will feature your yacht's branding and professional formatting.
                </p>
              </div>
              <Button
                onClick={handleDownload}
                disabled={isGenerating || !isRangeValid || selectedSections.length === 0}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Premium Report...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate PDF Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

