"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Upload } from "lucide-react";

const quoteSchema = z.object({
  workRequestId: z.string().min(1, "İş talebi gereklidir"),
  vendorId: z.string().optional(), // Will be validated manually when not using new vendor
  title: z.string().min(1, "Teklif başlığı gereklidir"),
  description: z.string().optional().nullable(),
  productService: z.string().optional().nullable(),
  amount: z.number().min(0, "Fiyat 0'dan büyük olmalıdır"),
  currency: z.string().default("EUR"),
  vatIncluded: z.boolean().default(false),
  deliveryTime: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface Vendor {
  id: string;
  name: string;
}

interface QuoteFormProps {
  workRequestId: string;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  showAddAnother?: boolean;
}

export function QuoteForm({ workRequestId, initialData, onSuccess, onCancel, showAddAnother = false }: QuoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isNewVendor, setIsNewVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch("/api/vendors");
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await response.json();
            setVendors(data);
          } catch (jsonError) {
            console.error("Failed to parse JSON response:", jsonError);
            const text = await response.text();
            console.error("Non-JSON response:", text.substring(0, 200));
          }
        } else {
          const text = await response.text();
          console.error("Non-JSON response received:", text.substring(0, 200));
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }
    };
    fetchVendors();
  }, []);

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema) as any,
    defaultValues: initialData
      ? {
          workRequestId: initialData.workRequestId || workRequestId,
          vendorId: initialData.vendorId || "",
          title: initialData.title || "",
          description: initialData.description || "",
          productService: initialData.productService || "",
          amount: initialData.amount || 0,
          currency: initialData.currency || "EUR",
          deliveryTime: initialData.deliveryTime || "",
          warranty: initialData.warranty || "",
          notes: initialData.notes || "",
        }
      : {
          workRequestId,
          vendorId: "",
          title: "",
          description: "",
          productService: "",
          amount: 0,
          currency: "EUR",
          vatIncluded: false,
          deliveryTime: "",
          warranty: "",
          notes: "",
        },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
    event.target.value = ""; // Reset input to allow selecting same file again
  };

  const uploadFileToQuote = async (quoteId: string, file: File): Promise<boolean> => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const response = await fetch(`/api/quotes/${quoteId}/document`, {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      
      if (response.ok) {
        if (contentType && contentType.includes("application/json")) {
          try {
            const doc = await response.json();
            setUploadedFiles([...uploadedFiles, doc.id]);
            return true;
          } catch (jsonError) {
            console.error("Failed to parse JSON response:", jsonError);
            const text = await response.text();
            setError(`Dosya yüklendi ancak yanıt parse edilemedi: ${text.substring(0, 200)}`);
            return false;
          }
        } else {
          setError("Dosya yüklendi ancak beklenmeyen yanıt formatı alındı");
          return false;
        }
      } else {
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await response.json();
            setError(error.error || "Dosya yüklenemedi");
          } catch (jsonError) {
            const text = await response.text();
            setError(`Dosya yüklenemedi: ${text.substring(0, 200)}`);
          }
        } else {
          const text = await response.text();
          setError(`Dosya yüklenemedi: ${text.substring(0, 200)}`);
        }
        return false;
      }
    } catch (err) {
      setError("Dosya yüklenirken bir hata oluştu");
      return false;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!initialData?.id) {
      setError("Önce teklifi kaydedin, sonra dosya yükleyin");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFileToQuote(initialData.id, file);
    if (onSuccess) {
      onSuccess();
    }
    event.target.value = ""; // Reset input
  };

  const onSubmit = async (data: QuoteFormData) => {
    setIsLoading(true);
    setError(null);

    // Validate vendor selection or new vendor name
    if (!isNewVendor && !data.vendorId) {
      setError("Lütfen bir firma seçin veya yeni firma ekleyin");
      setIsLoading(false);
      return;
    }

    if (isNewVendor && !newVendorName.trim()) {
      setError("Lütfen yeni firma adını girin");
      setIsLoading(false);
      return;
    }

    try {
      let vendorId = data.vendorId;

      // If new vendor name is provided, create vendor first
      if (isNewVendor && newVendorName.trim()) {
        const vendorResponse = await fetch("/api/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newVendorName.trim(),
          }),
        });

        if (!vendorResponse.ok) {
          const contentType = vendorResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              const vendorError = await vendorResponse.json();
              setError(vendorError.error || "Firma oluşturulamadı");
            } catch (jsonError) {
              setError("Firma oluşturulamadı");
            }
          } else {
            setError("Firma oluşturulamadı");
          }
          setIsLoading(false);
          return;
        }

        const contentType = vendorResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const newVendor = await vendorResponse.json();
            vendorId = newVendor.id;
            // Add new vendor to the list
            setVendors([...vendors, newVendor]);
            setIsNewVendor(false);
            setNewVendorName("");
          } catch (jsonError) {
            setError("Firma oluşturuldu ancak yanıt parse edilemedi");
            setIsLoading(false);
            return;
          }
        } else {
          setError("Firma oluşturuldu ancak beklenmeyen yanıt formatı alındı");
          setIsLoading(false);
          return;
        }
      }

      // Validate that we have a vendorId
      if (!vendorId) {
        setError("Lütfen bir firma seçin veya yeni firma adı girin");
        setIsLoading(false);
        return;
      }

      const url = initialData ? `/api/quotes/${initialData.id}` : "/api/quotes";
      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          vendorId,
        }),
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
        setError(result.error || "Teklif kaydedilemedi");
        setIsLoading(false);
        return;
      }

      const quoteId = result.id;

      // Upload file if selected (for new quotes)
      if (selectedFile && !initialData) {
        const fileUploaded = await uploadFileToQuote(quoteId, selectedFile);
        if (!fileUploaded) {
          // File upload failed, but quote was created - show warning but continue
          console.warn("Teklif oluşturuldu ancak dosya yüklenemedi");
        }
        setSelectedFile(null); // Clear selected file
      }

      // Reset form for adding another quote
      if (showAddAnother && !initialData) {
        form.reset({
          workRequestId,
          vendorId: "",
          title: "",
          description: "",
          productService: "",
          amount: 0,
          currency: "EUR",
          vatIncluded: false,
          deliveryTime: "",
          warranty: "",
          notes: "",
        });
        setIsNewVendor(false);
        setNewVendorName("");
        setSelectedFile(null);
        setError(null);
        setIsLoading(false);
        // Show success message
        alert("Teklif başarıyla eklendi! Başka bir teklif ekleyebilirsiniz.");
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else if (!showAddAnother && !initialData) {
        // Redirect to work request detail page
        if (typeof window !== "undefined") {
          window.location.href = `/dashboard/quotes/${workRequestId}`;
        }
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Teklifi Düzenle" : "Yeni Teklif"}</CardTitle>
        <CardDescription>
          {initialData
            ? "Teklif bilgilerini güncelleyin"
            : "Firmadan alınan teklifi kaydedin. Birden fazla firma için teklif ekleyebilirsiniz."}
        </CardDescription>
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
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firma *</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Select 
                        onValueChange={(value) => {
                          if (value === "new") {
                            setIsNewVendor(true);
                            field.onChange("");
                          } else {
                            setIsNewVendor(false);
                            setNewVendorName("");
                            field.onChange(value);
                          }
                        }} 
                        value={isNewVendor ? "new" : field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Firma seçin veya yeni ekleyin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">+ Yeni firma ekle</SelectItem>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isNewVendor && (
                        <Input
                          placeholder="Yeni firma adı"
                          value={newVendorName}
                          onChange={(e) => {
                            setNewVendorName(e.target.value);
                            // Clear vendorId when typing new vendor name
                            field.onChange("");
                          }}
                          onBlur={field.onBlur}
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teklif Başlığı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Zeta akü teklifi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productService"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ürün/Hizmet</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Zeta akü, Boola akü" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teklif Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Teklif detayları, özellikler, referanslar..."
                      {...field}
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiyat *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para Birimi</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="TRY">TRY</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teslim Süresi</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: 3 gün sonra" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vatIncluded"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>KDV Dahil</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      İşaretlenirse fiyat KDV dahil, işaretlenmezse KDV hariçtir (+ KDV)
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warranty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Garanti</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: 1 yıl, 6 ay" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ek notlar..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Teklif Dosyası</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={initialData?.id ? handleFileUpload : handleFileSelect}
                  disabled={uploadingFile || isLoading}
                  className="flex-1"
                />
                {uploadingFile && (
                  <span className="text-sm text-muted-foreground">Yükleniyor...</span>
                )}
              </div>
              {selectedFile && !initialData && (
                <p className="text-sm text-muted-foreground">
                  Seçilen dosya: {selectedFile.name} (Teklif kaydedildikten sonra yüklenecek)
                </p>
              )}
              {initialData?.documents && initialData.documents.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">Yüklenen Dosyalar:</p>
                  {initialData.documents.map((doc: { id: string; title: string | null }) => (
                    <div key={doc.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{doc.title || "Dosya"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  İptal
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                {showAddAnother && !initialData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.handleSubmit(onSubmit)();
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Kaydediliyor..." : "Kaydet ve Başka Ekle"}
                  </Button>
                )}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Kaydediliyor..." : initialData ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

