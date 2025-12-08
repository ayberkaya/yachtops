"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, FileText, Loader2 } from "lucide-react";

const SECTION_OPTIONS = [
  {
    id: "summary",
    label: "Executive summary",
    description: "Key KPIs for the selected timeframe.",
  },
  {
    id: "financial",
    label: "Financial overview",
    description: "Expense totals grouped by category and currency.",
  },
  {
    id: "trips",
    label: "Trips",
    description: "Voyages that started or ended in the chosen dates.",
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Completed maintenance and operational tasks.",
  },
  {
    id: "shopping",
    label: "Shopping lists",
    description: "Procurement activity and completion stats.",
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
  const [isPanelOpen, setIsPanelOpen] = useState(true);

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
                  Download a PDF report for any date range and choose which data blocks to include.
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
          <p className="text-sm font-medium">Report sections</p>
          <p className="text-xs text-muted-foreground">Select one or more data blocks.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SECTION_OPTIONS.map((option) => {
              const checked = selectedSections.includes(option.id);
              return (
                <label
                  key={option.id}
                  htmlFor={`section-${option.id}`}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 transition hover:bg-muted/40"
                >
                  <Checkbox
                    id={`section-${option.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleSection(option.id)}
                  />
                  <div>
                    <p className="text-sm font-medium leading-tight">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedSections.length === 0 && (
            <p className="mt-2 text-xs text-destructive">
              Select at least one section to generate the report.
            </p>
          )}
        </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Your PDF will only include the timeframe and sections selected above.
              </p>
              <Button
                onClick={handleDownload}
                disabled={isGenerating || !isRangeValid || selectedSections.length === 0}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
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

