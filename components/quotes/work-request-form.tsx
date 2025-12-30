"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Enums are now defined as string literals in the schema to avoid module loading issues

const workRequestSchema = z.object({
  title: z.string().min(1, "Başlık gereklidir"),
  description: z.string().optional().nullable(),
  category: z.enum(["MAINTENANCE", "REPAIR", "UPGRADE", "INSPECTION", "EMERGENCY", "OTHER"]).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  component: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  requestedCompletionDate: z.string().optional().nullable(),
  status: z.enum(["PENDING", "QUOTES_RECEIVED", "PRESENTED", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
});

type WorkRequestFormData = z.infer<typeof workRequestSchema>;

interface WorkRequestFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export function WorkRequestForm({ initialData, onSuccess }: WorkRequestFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<WorkRequestFormData>({
    resolver: zodResolver(workRequestSchema) as any,
        defaultValues: initialData
      ? {
          title: initialData.title || "",
          description: initialData.description || "",
          category: initialData.category || "MAINTENANCE",
          priority: initialData.priority || "NORMAL",
          component: initialData.component || "",
          location: initialData.location || "",
          requestedCompletionDate: initialData.requestedCompletionDate
            ? new Date(initialData.requestedCompletionDate).toISOString().split("T")[0]
            : "",
          status: initialData.status || "PENDING",
        }
      : {
          title: "",
          description: "",
          category: "MAINTENANCE",
          priority: "NORMAL",
          component: "",
          location: "",
          requestedCompletionDate: "",
          status: "PENDING",
        },
  });

  const onSubmit = async (data: WorkRequestFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = initialData ? `/api/work-requests/${initialData.id}` : "/api/work-requests";
      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      let result;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          const text = await response.text();
          setError(`Server error: ${response.status} ${response.statusText}. Response: ${text.substring(0, 200)}`);
          setIsLoading(false);
          return;
        }
      } else {
        // Response is not JSON, read as text
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        setError(`Server returned non-JSON response. Status: ${response.status}. ${text.substring(0, 200)}`);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMsg = result.error || result.message || "İş talebi kaydedilemedi";
        const details = result.details ? `\n\nDetaylar: ${result.details.substring(0, 500)}` : "";
        setError(`${errorMsg}${details}`);
        setIsLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Yeni iş talebi oluşturulduktan sonra direkt teklif ekleme sayfasına yönlendir
        router.push(`/dashboard/quotes/${result.id}/add-quote`);
        router.refresh();
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "İş Talebini Düzenle" : "Yeni İş Talebi"}</CardTitle>
        <CardDescription>Bakım veya onarım için iş talebi oluşturun</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlık *</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: Kromlar değişecek" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="İş hakkında detaylı bilgi..."
                      {...field}
                      value={field.value || ""}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "MAINTENANCE"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAINTENANCE">Bakım</SelectItem>
                          <SelectItem value="REPAIR">Onarım</SelectItem>
                          <SelectItem value="UPGRADE">Yükseltme</SelectItem>
                          <SelectItem value="INSPECTION">Kontrol</SelectItem>
                          <SelectItem value="EMERGENCY">Acil</SelectItem>
                          <SelectItem value="OTHER">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Öncelik</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "NORMAL"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Öncelik seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Düşük</SelectItem>
                          <SelectItem value="NORMAL">Normal</SelectItem>
                          <SelectItem value="HIGH">Yüksek</SelectItem>
                          <SelectItem value="URGENT">Acil</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="component"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bileşen/Parça</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Akü, Kromlar, Motor, Elektrik sistemi"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      İşin yapılacağı parça veya sistem
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokasyon</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Marina XYZ, Liman ABC"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      İşin yapılacağı yer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requestedCompletionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İstenen Tamamlanma Tarihi</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    İşin tamamlanmasını istediğiniz tarih
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Kaydediliyor..." : initialData ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

