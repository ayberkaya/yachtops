import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { hasPermission } from "@/lib/permissions";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user, "quotes.view", session.user.permissions)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { scopedSession } = tenantResult;

    const { id } = await params;

    const workRequest = await db.workRequest.findFirst({
      where: withTenantScope(scopedSession, { id }),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        quotes: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                contactPerson: true,
                email: true,
                phone: true,
                address: true,
              },
            },
            documents: {
              orderBy: { uploadedAt: "desc" },
            },
          },
          orderBy: { amount: "asc" },
        },
      },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Dynamic import for jsPDF to reduce initial bundle size
    const { jsPDF } = await import("jspdf");
    
    // Create PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPos + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.35); // Approximate line height
    };

    // Helper function to format currency
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency,
      }).format(amount);
    };

    // Header with gradient effect (simulated with colored rectangle)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 50, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("TEKLİF SUNUMU", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(), "dd MMMM yyyy"), pageWidth / 2, 35, { align: "center" });

    yPos = 60;

    // Work Request Information Section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("İŞ TALEBİ BİLGİLERİ", margin, yPos);
    yPos += 10;

    // Draw line under title
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 5;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Başlık:", margin, yPos);
    doc.setFont("helvetica", "normal");
    yPos += addText(workRequest.title, margin + 30, yPos, contentWidth - 30, 11);

    if (workRequest.description) {
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Açıklama:", margin, yPos);
      doc.setFont("helvetica", "normal");
      yPos += addText(workRequest.description, margin + 30, yPos, contentWidth - 30, 10);
    }

    yPos += 5;
    checkPageBreak(20);

    // Work Request Details Grid
    const details: Array<{ label: string; value: string }> = [];

    if (workRequest.category) {
      const categoryMap: Record<string, string> = {
        MAINTENANCE: "Bakım",
        REPAIR: "Onarım",
        UPGRADE: "Yükseltme",
        INSPECTION: "Kontrol",
        EMERGENCY: "Acil",
        OTHER: "Diğer",
      };
      details.push({ label: "Kategori", value: categoryMap[workRequest.category] || workRequest.category });
    }

    if (workRequest.component) {
      details.push({ label: "Bileşen/Parça", value: workRequest.component });
    }

    if (workRequest.location) {
      details.push({ label: "Lokasyon", value: workRequest.location });
    }

    if (workRequest.requestedCompletionDate) {
      details.push({
        label: "İstenen Tarih",
        value: format(new Date(workRequest.requestedCompletionDate), "dd MMMM yyyy"),
      });
    }

    const statusMap: Record<string, string> = {
      PENDING: "Beklemede",
      QUOTES_RECEIVED: "Teklif Alındı",
      PRESENTED: "Sunum Yapıldı",
      APPROVED: "Onaylandı",
      REJECTED: "Reddedildi",
      CANCELLED: "İptal Edildi",
    };
    details.push({ label: "Durum", value: statusMap[workRequest.status] || workRequest.status });

    if (workRequest.createdBy) {
      details.push({
        label: "Oluşturan",
        value: workRequest.createdBy.name || workRequest.createdBy.email || "-",
      });
    }

    details.push({
      label: "Oluşturulma Tarihi",
      value: format(new Date(workRequest.createdAt), "dd MMMM yyyy"),
    });

    // Draw details in two columns
    const col1X = margin;
    const col2X = pageWidth / 2 + 10;
    const colWidth = (contentWidth - 20) / 2;

    details.forEach((detail, index) => {
      if (index % 2 === 0) {
        checkPageBreak(8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(detail.label + ":", col1X, yPos);
        doc.setFont("helvetica", "normal");
        yPos += addText(detail.value, col1X + 35, yPos - 5, colWidth - 35, 10);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(detail.label + ":", col2X, yPos - 5);
        doc.setFont("helvetica", "normal");
        addText(detail.value, col2X + 35, yPos - 5, colWidth - 35, 10);
      }
      if (index % 2 === 1) {
        yPos += 8;
      }
    });

    yPos += 10;
    checkPageBreak(30);

    // Quotes Section
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("TEKLİFLER", margin, yPos);
    yPos += 10;

    // Draw line under title
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 5;

    if (workRequest.quotes.length === 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Henüz teklif eklenmemiş", margin, yPos);
    } else {
      workRequest.quotes.forEach((quote: {
        id: string;
        title: string;
        description: string | null;
        productService: string | null;
        amount: number;
        currency: string;
        vatIncluded: boolean;
        deliveryTime: string | null;
        warranty: string | null;
        notes: string | null;
        vendor: {
          id: string;
          name: string;
          contactPerson: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
        };
        documents: Array<{
          id: string;
          title: string | null;
        }>;
      }, index: number) => {
        checkPageBreak(80);

        // Quote Card Background
        doc.setFillColor(249, 250, 251); // gray-50
        doc.roundedRect(margin, yPos - 5, contentWidth, 70, 3, 3, "F");

        // Quote Title
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`Teklif ${index + 1}: ${quote.title}`, margin + 5, yPos + 5);

        // Vendor Name
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Firma: ${quote.vendor.name}`, margin + 5, yPos + 12);

        let quoteYPos = yPos + 20;

        // Price (highlighted)
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        const priceText = formatCurrency(quote.amount, quote.currency);
        const vatText = quote.vatIncluded ? " (KDV Dahil)" : " (+ KDV)";
        doc.text("Fiyat:", margin + 5, quoteYPos);
        doc.text(priceText + vatText, margin + 25, quoteYPos);

        quoteYPos += 10;

        // Quote Details
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const quoteDetails: Array<{ label: string; value: string }> = [];

        if (quote.productService) {
          quoteDetails.push({ label: "Ürün/Hizmet", value: quote.productService });
        }
        if (quote.deliveryTime) {
          quoteDetails.push({ label: "Teslim Süresi", value: quote.deliveryTime });
        }
        if (quote.warranty) {
          quoteDetails.push({ label: "Garanti", value: quote.warranty });
        }

        quoteDetails.forEach((detail) => {
          doc.setFont("helvetica", "bold");
          doc.text(detail.label + ":", margin + 5, quoteYPos);
          doc.setFont("helvetica", "normal");
          const valueLines = doc.splitTextToSize(detail.value, contentWidth - 50);
          doc.text(valueLines, margin + 35, quoteYPos);
          quoteYPos += valueLines.length * 4;
        });

        // Vendor Contact Information
        quoteYPos += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Firma İletişim Bilgileri:", margin + 5, quoteYPos);
        quoteYPos += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const vendorInfo: string[] = [];
        if (quote.vendor.contactPerson) {
          vendorInfo.push(`İletişim Kişisi: ${quote.vendor.contactPerson}`);
        }
        if (quote.vendor.email) {
          vendorInfo.push(`E-posta: ${quote.vendor.email}`);
        }
        if (quote.vendor.phone) {
          vendorInfo.push(`Telefon: ${quote.vendor.phone}`);
        }
        if (quote.vendor.address) {
          vendorInfo.push(`Adres: ${quote.vendor.address}`);
        }

        vendorInfo.forEach((info) => {
          doc.text(info, margin + 5, quoteYPos);
          quoteYPos += 4;
        });

        // Quote Description
        if (quote.description) {
          quoteYPos += 3;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Açıklama:", margin + 5, quoteYPos);
          quoteYPos += 5;
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(quote.description, contentWidth - 10);
          doc.text(descLines, margin + 5, quoteYPos);
          quoteYPos += descLines.length * 4;
        }

        // Quote Notes
        if (quote.notes) {
          quoteYPos += 3;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Notlar:", margin + 5, quoteYPos);
          quoteYPos += 5;
          doc.setFont("helvetica", "normal");
          const notesLines = doc.splitTextToSize(quote.notes, contentWidth - 10);
          doc.text(notesLines, margin + 5, quoteYPos);
          quoteYPos += notesLines.length * 4;
        }

        // Documents
        if (quote.documents.length > 0) {
          quoteYPos += 3;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text("Ek Dosyalar:", margin + 5, quoteYPos);
          quoteYPos += 5;
          doc.setFont("helvetica", "normal");
          quote.documents.forEach((document) => {
            doc.text(`• ${document.title || "Dosya"}`, margin + 5, quoteYPos);
            quoteYPos += 4;
          });
        }

        yPos = quoteYPos + 15;
      });
    }

    // Footer on each page
    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Sayfa ${pageNum} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        format(new Date(), "dd.MM.yyyy HH:mm"),
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    };

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const fileName = `teklif-sunumu-${workRequest.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${format(new Date(), "yyyyMMdd")}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating quote PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

