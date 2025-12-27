"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Presentation, FileCheck, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetsProps {
  presentationMode: boolean;
}

interface Asset {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "presentation" | "contract" | "image";
  url?: string;
  size?: string;
  category: "sales" | "contracts" | "marketing";
}

// Mock assets - In production, these would come from database or file storage
const assets: Asset[] = [
  {
    id: "1",
    title: "Ürün Sunum Sunusu",
    description: "Müşterilere gösterilecek ana ürün sunumu (PDF)",
    type: "presentation",
    category: "sales",
    size: "2.5 MB",
  },
  {
    id: "2",
    title: "Fiyatlandırma Kataloğu",
    description: "Tüm paketlerin detaylı fiyatlandırması ve özellikleri",
    type: "pdf",
    category: "sales",
    size: "1.8 MB",
  },
  {
    id: "3",
    title: "Standart Hizmet Sözleşmesi",
    description: "Müşterilerle imzalanacak standart sözleşme taslağı",
    type: "contract",
    category: "contracts",
    size: "450 KB",
  },
  {
    id: "4",
    title: "ROI Hesaplama Şablonu",
    description: "Excel tabanlı ROI hesaplama şablonu",
    type: "pdf",
    category: "sales",
    size: "320 KB",
  },
  {
    id: "5",
    title: "Ürün Özellikleri Broşürü",
    description: "Görsel ürün özellikleri ve avantajları broşürü",
    type: "image",
    category: "marketing",
    size: "3.2 MB",
  },
  {
    id: "6",
    title: "Enterprise Özel Sözleşme",
    description: "Enterprise müşteriler için özelleştirilebilir sözleşme",
    type: "contract",
    category: "contracts",
    size: "680 KB",
  },
];

const typeIcons = {
  pdf: FileText,
  presentation: Presentation,
  contract: FileCheck,
  image: ImageIcon,
};

const categoryLabels = {
  sales: "Satış",
  contracts: "Sözleşmeler",
  marketing: "Pazarlama",
};

export function Assets({ presentationMode }: AssetsProps) {
  const handleDownload = (asset: Asset) => {
    // In production, this would trigger actual file download
    // For now, we'll just show an alert
    alert(`${asset.title} indiriliyor...\n\nNot: Bu özellik henüz tam olarak entegre edilmedi. Dosyalar dosya depolama sistemine bağlandığında aktif olacak.`);
  };

  const groupedAssets = assets.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedAssets).map(([category, categoryAssets]) => (
        <div key={category} className="space-y-4">
          <h2 className={cn(
            "text-xl font-semibold text-slate-900",
            presentationMode && "text-2xl"
          )}>
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryAssets.map((asset) => {
              const Icon = typeIcons[asset.type];
              return (
                <Card
                  key={asset.id}
                  className={cn(
                    "hover:shadow-lg transition-all",
                    presentationMode && "shadow-lg border-2"
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-slate-100 flex-shrink-0",
                        presentationMode && "p-3"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5 text-slate-600",
                          presentationMode && "w-6 h-6"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className={cn(
                          "text-base mb-1",
                          presentationMode && "text-lg"
                        )}>
                          {asset.title}
                        </CardTitle>
                        {asset.size && (
                          <p className={cn(
                            "text-xs text-muted-foreground",
                            presentationMode && "text-sm"
                          )}>
                            {asset.size}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className={cn(
                      "text-sm",
                      presentationMode && "text-base"
                    )}>
                      {asset.description}
                    </CardDescription>
                    <Button
                      onClick={() => handleDownload(asset)}
                      className="w-full"
                      variant="outline"
                      size={presentationMode ? "lg" : "default"}
                    >
                      <Download className={cn(
                        "w-4 h-4 mr-2",
                        presentationMode && "w-5 h-5"
                      )} />
                      İndir
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Info Card */}
      <Card className={cn(
        "bg-blue-50 border-blue-200",
        presentationMode && "shadow-lg border-2"
      )}>
        <CardContent className="pt-6">
          <p className={cn(
            "text-sm text-blue-700",
            presentationMode && "text-base"
          )}>
            <strong>Not:</strong> Bu kaynaklar şu anda örnek verilerdir. Gerçek dosyalar dosya depolama sistemine (Supabase Storage) bağlandığında burada görünecektir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

