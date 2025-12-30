"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function PrintButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const pathname = usePathname();
  
  // Extract work request ID from pathname: /dashboard/quotes/[id]/presentation
  const workRequestId = pathname?.split("/")[3];

  const handleDownload = async () => {
    if (!workRequestId) {
      alert("İş talebi ID'si bulunamadı");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/quotes/${workRequestId}/pdf`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "PDF oluşturulamadı");
      }

      const blob = await response.blob();

      if (blob.type !== "application/pdf" && blob.size === 0) {
        throw new Error("Geçersiz PDF yanıtı");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `teklif-sunumu-${workRequestId}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "PDF oluşturulamadı. Lütfen tekrar deneyin.";
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isGenerating}>
      <Download className="h-4 w-4 mr-2" />
      {isGenerating ? "Oluşturuluyor..." : "PDF Olarak İndir"}
    </Button>
  );
}

