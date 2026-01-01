"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, FileBarChart } from "lucide-react";
import { generateReport, ReportFilters } from "@/actions/reports";
import { ReportView } from "./report-view";
import { ExpenseCategory, PaymentMethod, PaidBy } from "@prisma/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const reportBuilderSchema = z.object({
  dateRange: z.enum(["lastMonth", "thisMonth", "thisYear", "lastYear", "custom"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  paymentMethods: z.array(z.nativeEnum(PaymentMethod)).optional(),
  paidBy: z.array(z.nativeEnum(PaidBy)).optional(),
  includeDraft: z.boolean().optional(),
  viewType: z.enum(["summary", "detailed"]).optional(),
});

type ReportBuilderFormData = z.infer<typeof reportBuilderSchema>;

interface ReportBuilderProps {
  categories: ExpenseCategory[];
}

export function ReportBuilder({ categories }: ReportBuilderProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize dates based on default dateRange
  const now = new Date();
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const form = useForm<ReportBuilderFormData>({
    resolver: zodResolver(reportBuilderSchema),
    defaultValues: {
      dateRange: "lastMonth",
      startDate: format(lastMonthStart, "yyyy-MM-dd"),
      endDate: format(lastMonthEnd, "yyyy-MM-dd"),
      categoryIds: [],
      paymentMethods: [],
      paidBy: [],
      includeDraft: false,
      viewType: "summary",
    },
  });

  const dateRange = form.watch("dateRange");

  const handleDateRangeChange = (value: string) => {
    form.setValue("dateRange", value as any);
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (value) {
      case "lastMonth":
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case "thisMonth":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "lastYear":
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return; // Custom - don't set dates
    }

    form.setValue("startDate", format(start, "yyyy-MM-dd"));
    form.setValue("endDate", format(end, "yyyy-MM-dd"));
  };

  const onSubmit = async (data: ReportBuilderFormData) => {
    setIsGenerating(true);
    setError(null);
    setReportData(null);

    try {
      // Build filters
      const filters: ReportFilters = {
        startDate: data.startDate,
        endDate: data.endDate,
        categoryIds: data.categoryIds && data.categoryIds.length > 0 ? data.categoryIds : undefined,
        paymentMethods: data.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : undefined,
        paidBy: data.paidBy && data.paidBy.length > 0 ? data.paidBy : undefined,
        includeDraft: data.includeDraft ?? false,
      };

      const result = await generateReport(filters);

      if (result.success && result.data) {
        setReportData({ ...result.data, viewType: "detailed" });
      } else {
        setError(result.error || "An error occurred while generating the report");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  if (reportData) {
    return <ReportView data={reportData} onBack={() => setReportData(null)} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Report Builder
          </CardTitle>
          <CardDescription>
            Create your report by selecting a date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Date Range */}
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Range</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleDateRangeChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lastMonth">Last Month</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                        <SelectItem value="thisYear">This Year</SelectItem>
                        <SelectItem value="lastYear">Last Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom Date Range */}
              {dateRange === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isGenerating} className="w-full mb-6">
                {isGenerating ? "Generating Report..." : "Generate Report"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

