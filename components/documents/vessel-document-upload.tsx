"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const toTitleCase = (str: string): string => {
  return str
    .split(" ")
    .map((word) => {
      if (!word) return word;
      // Preserve special cases like acronyms, slashes, hyphens
      if (word.includes("/") || word.includes("–") || word.includes("-")) {
        return word
          .split(/([/–-])/)
          .map((part) => {
            if (part.match(/^[/–-]$/)) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

const VESSEL_DOCUMENT_CATEGORIES = [
  {
    title: "Emniyet Ve Can Güvenliği Sertifikaları",
    items: [
      "Fire Safety Certificate (Yangın Emniyeti Sertifikası)",
      "Life Saving Appliances Certificate (Can Kurtarma Donanımı Sertifikası)",
      "Load Line Certificate (Yükleme Hattı Sertifikası – Ll)",
      "Safety Construction Certificate (Emniyet Yapı Sertifikası)",
      "Safety Equipment Certificate (Emniyet Teçhizatı Sertifikası)",
      "Safety Radio Certificate (Telsiz Emniyet Sertifikası – Gmdss)",
    ],
  },
  {
    title: "Makine – Çevre – Teknik Uygunluk",
    items: [
      "Annex I – Oil Pollution",
      "Annex IV – Sewage",
      "Annex V – Garbage",
      "Elektrik Sistemleri Sertifikası",
      "Gaz Sızdırmazlık Sertifikası",
      "Garbage Management Plan",
      "Iopp Sertifikası (Oil Pollution Prevention)",
      "Makine Sertifikası (Engine Certificate)",
      "Marpol Uygunluk Sertifikaları",
      "Sewage Treatment Certificate",
      "Shaft & Propulsion Survey Sertifikası",
    ],
  },
  {
    title: "Ticari / Charter Yatlar İçin Ek Zorunlular",
    items: [
      "Charter Permit / Charter License",
      "Commercial Yacht Code Compliance (Mca Ly3 / Reg Yacht Code Vb.)",
      "Helideck Sertifikasyonu (Helikopterli Megayatlarda)",
      "Isps Uygunluğu (Büyük Yatlarda)",
      "Medical Locker Sertifikasyonu",
      "Minimum Safe Manning Document",
      "Passenger Limit Certificate (Kaç Kişi Taşınabileceği)",
    ],
  },
  {
    title: "Türkiye Özel (Liman Başkanlığı – Ulaştırma)",
    items: [
      "Can Salı Ve Yangın Donanımı Sörvey Onayları",
      "Denize Elverişlilik Belgesi",
      "Donatım Muayene Tutanağı",
      "Özel Yat Belgesi Veya Ticari Yat Belgesi",
      "Telsiz Ruhsatnamesi",
      "Türk Bayrağı Çekme Belgesi Veya Geçici Bayrak Belgesi",
      "Yıllık Sörvey Raporları",
    ],
  },
  {
    title: "Vessel Certifications – Yatlar İçin Gemi Belgeleri",
    items: [
      "Bayrak Devleti Tescil Belgesi (Certificate Of Registry)",
      "Emniyet Yönetim Sertifikası (Doc – Ism Company)",
      "Emniyetli İşletme Sertifikası (Smc – Safety Management Certificate)",
      "Gövde Ve Makine Sigorta Sertifikası",
      "Klas Sertifikası (Varsa Lloyd, Rina, Bv, Abs, Dnv Vb.)",
      "P&I Sigorta Sertifikası",
      "Tonilato Belgesi / Tonaj Sertifikası (Tonnage Certificate – Itc 69)",
      "Uygunluk Belgesi – Commercial Yacht Compliance Certificate",
      "Uygunluk Belgesi – Private Yacht Compliance Certificate",
      "Yatın Mülkiyet Belgesi / Title / Bill Of Sale",
    ],
  },
]
  .map((category) => ({
    ...category,
    title: toTitleCase(category.title),
    items: category.items.sort((a, b) => {
      const getSortKey = (str: string) => {
        const turkishPart = str.split("(")[0].trim();
        return turkishPart.toLowerCase();
      };
      return getSortKey(a).localeCompare(getSortKey(b), "tr");
    }),
  }))
  .sort((a, b) => {
    const getSortKey = (str: string) => {
      return str.toLowerCase();
    };
    return getSortKey(a.title).localeCompare(getSortKey(b.title), "tr");
  });

interface VesselDocumentUploadProps {
  onUploadSuccess?: () => void;
}

export function VesselDocumentUpload({ onUploadSuccess }: VesselDocumentUploadProps) {
  const [title, setTitle] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a document file to upload.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      if (expiryDate) {
        formData.append("expiryDate", expiryDate);
      }
      formData.append("file", file);

      const res = await fetch("/api/vessel-documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to upload document.");
        setIsSubmitting(false);
        return;
      }

      setTitle("");
      setExpiryDate("");
      setFile(null);
      setIsSubmitting(false);
      onUploadSuccess?.();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-zinc-200/60">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Select
                value={title}
                onValueChange={(value) => setTitle(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a document type" />
                </SelectTrigger>
                <SelectContent>
                  {VESSEL_DOCUMENT_CATEGORIES.map((category, index) => (
                    <SelectGroup key={category.title}>
                      <SelectLabel>{category.title}</SelectLabel>
                      {category.items.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                      {index < VESSEL_DOCUMENT_CATEGORIES.length - 1 && <SelectSeparator />}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Expiry Date (Optional)</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="When does this document expire?"
            />
            <p className="text-xs text-muted-foreground">
              You will receive a warning when the expiry date is approaching (30 days before).
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

