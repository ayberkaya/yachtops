import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseStatus, ShoppingListStatus, TaskStatus, TripStatus } from "@prisma/client";
import { endOfDay, format, isValid, parseISO, startOfDay, differenceInDays } from "date-fns";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { getSignedUrl } from "@/lib/supabase-storage";

const SECTION_KEYS = ["summary", "financial", "trips", "tasks", "shopping"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

const isSectionKey = (value: string): value is SectionKey =>
  SECTION_KEYS.includes(value as SectionKey);

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantResult = resolveTenantOrResponse(session, request);
    if (tenantResult instanceof NextResponse) {
      return tenantResult;
    }
    const { tenantId, scopedSession } = tenantResult;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    let rawStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (startParam) {
      const parsed = parseISO(startParam);
      if (!isValid(parsed)) {
        return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
      }
      rawStartDate = parsed;
    }

    let rawEndDate = now;
    if (endParam) {
      const parsed = parseISO(endParam);
      if (!isValid(parsed)) {
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      }
      rawEndDate = parsed;
    }

    const startDate = startOfDay(rawStartDate);
    const endDate = endOfDay(rawEndDate);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date must be before or equal to end date" },
        { status: 400 }
      );
    }

    const sectionsFromQuery = searchParams.getAll("sections");
    const normalizedSections = sectionsFromQuery
      .flatMap((entry) => entry.split(","))
      .map((section) => section.trim())
      .filter((section): section is SectionKey => section.length > 0 && isSectionKey(section));
    const selectedSections: SectionKey[] =
      normalizedSections.length > 0
        ? Array.from(new Set(normalizedSections))
        : [...SECTION_KEYS];
    const sectionSet = new Set<SectionKey>(selectedSections);

    // For Yacht model, tenantId IS the yacht id, so we query directly
    const yacht = await db.yacht.findFirst({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        flag: true,
        length: true,
        registrationNumber: true,
        logoUrl: true,
        settings: true,
      },
    });

    // Get yacht logo URL if available
    let yachtLogoUrl: string | null = null;
    if (yacht?.logoUrl) {
      try {
        const logoPath = yacht.logoUrl;
        // Logo is stored in tenant-assets bucket (as per onboarding)
        // Try tenant-assets bucket first, then fallback to helmops-files
        try {
          yachtLogoUrl = await getSignedUrl("tenant-assets", logoPath, 3600);
        } catch {
          // Fallback to helmops-files if tenant-assets doesn't exist
          yachtLogoUrl = await getSignedUrl("helmops-files", logoPath, 3600);
        }
      } catch (error) {
        console.error("Error fetching yacht logo:", error);
        // Continue without logo if fetch fails
      }
    }

    const expenses = await db.expense.findMany({
      where: withTenantScope(scopedSession, {
        status: ExpenseStatus.APPROVED,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      }),
      include: {
        category: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        trip: { select: { name: true, code: true } },
      },
      orderBy: { date: "desc" },
    });

    const trips = await db.trip.findMany({
      where: withTenantScope(scopedSession, {
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      }),
      include: {
        createdBy: { select: { name: true } },
        expenses: {
          where: { status: ExpenseStatus.APPROVED, deletedAt: null },
          select: { amount: true, currency: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    const completedTasks = await db.task.findMany({
      where: withTenantScope(scopedSession, {
        status: TaskStatus.DONE,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
      include: {
        completedBy: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        trip: { select: { name: true, code: true } },
      },
      orderBy: { completedAt: "desc" },
    });

    const completedShoppingLists = await db.shoppingList.findMany({
      where: withTenantScope(scopedSession, {
        status: ShoppingListStatus.COMPLETED,
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
        items: {
          select: { name: true, quantity: true, unit: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const expensesByCategory: Record<string, { total: number; count: number; currency: string }> = {};
    const expensesByCurrency: Record<string, number> = {};
    const primaryCurrency = ((yacht?.settings as { currency?: string } | null)?.currency || "EUR").toUpperCase();

    expenses.forEach((exp: { amount: string | number; category: { name: string }; currency: string }) => {
      const amount = Number(exp.amount);
      const categoryName = exp.category.name;
      const currency = exp.currency;

      if (!expensesByCategory[categoryName]) {
        expensesByCategory[categoryName] = { total: 0, count: 0, currency: primaryCurrency };
      }
      expensesByCategory[categoryName].total += amount;
      expensesByCategory[categoryName].count += 1;
      expensesByCurrency[currency] = (expensesByCurrency[currency] || 0) + amount;
    });

    const totalPrimaryCurrency = expensesByCurrency[primaryCurrency] || 0;
    const totalAllCurrencies = Object.values(expensesByCurrency).reduce((sum, val) => sum + val, 0);
    const daysInPeriod = differenceInDays(endDate, startDate) + 1;

    // Dynamic import for jsPDF to reduce initial bundle size
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Premium color scheme
    const primaryColor = [20, 184, 166]; // Teal
    const accentColor = [59, 130, 246]; // Blue
    const textColor = [17, 24, 39]; // Dark gray
    const lightGray = [243, 244, 246];
    const borderColor = [229, 231, 235];

    // Helper to sanitize text for PDF (remove problematic characters)
    const sanitizeText = (text: string): string => {
      if (!text) return "";
      // Remove or replace problematic characters that jsPDF can't handle
      return text
        .replace(/[^\x00-\x7F]/g, (char) => {
          // Try to preserve common Turkish characters
          const turkishMap: Record<string, string> = {
            "ç": "c", "Ç": "C",
            "ğ": "g", "Ğ": "G",
            "ı": "i", "İ": "I",
            "ö": "o", "Ö": "O",
            "ş": "s", "Ş": "S",
            "ü": "u", "Ü": "U",
          };
          return turkishMap[char] || char;
        })
        .replace(/[^\x00-\xFF]/g, ""); // Remove any remaining non-ASCII
    };

    const addText = (
      text: string,
      fontSize: number = 10,
      isBold: boolean = false,
      color: number[] = textColor,
      x: number = margin
    ) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(color[0], color[1], color[2]);
      const sanitizedText = sanitizeText(text);
      const lines = doc.splitTextToSize(sanitizedText, contentWidth - (x - margin));
      doc.text(lines, x, yPos);
      yPos += lines.length * (fontSize * 0.4) + 5;
    };

    const addSectionHeader = (text: string) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;
      
      // Section header with background box
      const headerHeight = 12;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      try {
        (doc as any).roundedRect(margin, yPos - 8, contentWidth, headerHeight, 2, 2, "F");
      } catch {
        doc.rect(margin, yPos - 8, contentWidth, headerHeight, "F");
      }
      
      // Header text (white on colored background)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(sanitizeText(text), margin + 8, yPos);
      
      yPos += 15;
    };

    const addMetricBox = (label: string, value: string, width: number = (contentWidth - 10) / 3) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      const x = margin;
      const boxHeight = 20;
      
      // Box background
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      try {
        // Try roundedRect (available in jsPDF 2.x+)
        (doc as any).roundedRect(x, yPos - 12, width, boxHeight, 2, 2, "F");
      } catch {
        // Fallback to regular rect
        doc.rect(x, yPos - 12, width, boxHeight, "F");
      }
      
      // Border
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      try {
        (doc as any).roundedRect(x, yPos - 12, width, boxHeight, 2, 2, "D");
      } catch {
        doc.rect(x, yPos - 12, width, boxHeight, "D");
      }
      
      // Label
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(label, x + 5, yPos - 5);
      
      // Value
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(value, x + 5, yPos + 3);
    };

    // Premium Header with Logo
    const periodLabel = `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
    
    // Header background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 50, "F");
    
    // Try to add yacht logo
    if (yachtLogoUrl) {
      try {
        const logoResponse = await fetch(yachtLogoUrl);
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          const logoBase64 = Buffer.from(logoBuffer).toString("base64");
          const logoMimeType = logoResponse.headers.get("content-type") || "image/png";
          
          doc.addImage(
            `data:${logoMimeType};base64,${logoBase64}`,
            "PNG",
            margin,
            8,
            30,
            30
          );
        }
      } catch (error) {
        console.error("Error adding logo to PDF:", error);
      }
    }
    
    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    const headerX = yachtLogoUrl ? margin + 35 : pageWidth / 2;
    doc.text("Operations Report", headerX, 20, yachtLogoUrl ? {} : { align: "center" });
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    const yachtName = sanitizeText(yacht?.name || "Yacht Operations");
    doc.text(yachtName, headerX, 30, yachtLogoUrl ? {} : { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Period: ${periodLabel}`, headerX, 38, yachtLogoUrl ? {} : { align: "center" });
    
    // Yacht details in header
    if (yacht?.flag || yacht?.length || yacht?.registrationNumber) {
      doc.setFontSize(8);
      const details: string[] = [];
      if (yacht.flag) details.push(`Flag: ${sanitizeText(yacht.flag)}`);
      if (yacht.length) details.push(`${yacht.length}m`);
      if (yacht.registrationNumber) details.push(`Reg: ${sanitizeText(yacht.registrationNumber)}`);
      doc.text(details.join(" • "), pageWidth - margin, 38, { align: "right" });
    }
    
    yPos = 60;

    if (sectionSet.has("summary")) {
      addSectionHeader("Executive Summary");
      
      // Key Metrics Boxes - positioned side by side
      const boxWidth = (contentWidth - 20) / 3;
      const boxSpacing = 10;
      const boxY = yPos;
      
      // First box
      const box1X = margin;
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      try {
        (doc as any).roundedRect(box1X, boxY - 12, boxWidth, 20, 2, 2, "F");
      } catch {
        doc.rect(box1X, boxY - 12, boxWidth, 20, "F");
      }
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      try {
        (doc as any).roundedRect(box1X, boxY - 12, boxWidth, 20, 2, 2, "D");
      } catch {
        doc.rect(box1X, boxY - 12, boxWidth, 20, "D");
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Total Expenses", box1X + 5, boxY - 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      const expenseValue = totalPrimaryCurrency > 0
        ? totalPrimaryCurrency.toLocaleString("en-US", { style: "currency", currency: primaryCurrency })
        : "N/A";
      doc.text(expenseValue, box1X + 5, boxY + 3);
      
      // Second box
      const box2X = box1X + boxWidth + boxSpacing;
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      try {
        (doc as any).roundedRect(box2X, boxY - 12, boxWidth, 20, 2, 2, "F");
      } catch {
        doc.rect(box2X, boxY - 12, boxWidth, 20, "F");
      }
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      try {
        (doc as any).roundedRect(box2X, boxY - 12, boxWidth, 20, 2, 2, "D");
      } catch {
        doc.rect(box2X, boxY - 12, boxWidth, 20, "D");
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Transactions", box2X + 5, boxY - 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(expenses.length.toString(), box2X + 5, boxY + 3);
      
      // Third box
      const completedTrips = trips.filter((t: { status: TripStatus }) => t.status === TripStatus.COMPLETED).length;
      const box3X = box2X + boxWidth + boxSpacing;
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      try {
        (doc as any).roundedRect(box3X, boxY - 12, boxWidth, 20, 2, 2, "F");
      } catch {
        doc.rect(box3X, boxY - 12, boxWidth, 20, "F");
      }
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      try {
        (doc as any).roundedRect(box3X, boxY - 12, boxWidth, 20, 2, 2, "D");
      } catch {
        doc.rect(box3X, boxY - 12, boxWidth, 20, "D");
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Completed Trips", box3X + 5, boxY - 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`${completedTrips} / ${trips.length}`, box3X + 5, boxY + 3);
      
      yPos += 20;
      
      // Detailed Summary
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      addText("Report Overview", margin);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      addText(`Reporting Period: ${periodLabel} (${daysInPeriod} days)`, margin + 5);
      
      if (expenses.length > 0) {
        const avgDailyExpense = totalPrimaryCurrency / daysInPeriod;
        addText(
          `Financial Activity: ${expenses.length} approved transactions totaling ${totalPrimaryCurrency.toLocaleString("en-US", { style: "currency", currency: primaryCurrency })}`,
          margin + 5
        );
        addText(
          `Average Daily Spending: ${avgDailyExpense.toLocaleString("en-US", { style: "currency", currency: primaryCurrency })}`,
          margin + 5
        );
      }
      
      if (trips.length > 0) {
        const completedTripsCount = trips.filter((t: { status: TripStatus }) => t.status === TripStatus.COMPLETED).length;
        const ongoingTrips = trips.filter((t: { status: TripStatus }) => t.status === TripStatus.ONGOING).length;
        addText(
          `Voyage Activity: ${trips.length} trip${trips.length !== 1 ? "s" : ""} (${completedTripsCount} completed, ${ongoingTrips} ongoing)`,
          margin + 5
        );
      }
      
      if (completedTasks.length > 0) {
        addText(`Maintenance & Operations: ${completedTasks.length} task${completedTasks.length !== 1 ? "s" : ""} completed`, margin + 5);
      }
      
      if (completedShoppingLists.length > 0) {
        const totalItems = completedShoppingLists.reduce((sum: number, list: { _count: { items: number } }) => sum + list._count.items, 0);
        addText(
          `Procurement: ${completedShoppingLists.length} shopping list${completedShoppingLists.length !== 1 ? "s" : ""} completed with ${totalItems} item${totalItems !== 1 ? "s" : ""}`,
          margin + 5
        );
      }
      
      yPos += 5;
    }

    if (sectionSet.has("financial")) {
      addSectionHeader("Financial Analysis");
      
      if (expenses.length === 0) {
        addText("No approved expenses recorded in the selected date range.", 10);
      } else {
        // Summary Statistics
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        addText("Financial Summary", margin);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        addText(`Total Transactions: ${expenses.length}`, margin + 5);
        addText(`Total Amount (All Currencies): ${totalAllCurrencies.toLocaleString("en-US", { style: "currency", currency: primaryCurrency })}`, margin + 5);
        if (daysInPeriod > 0) {
          addText(`Average per Day: ${(totalPrimaryCurrency / daysInPeriod).toLocaleString("en-US", { style: "currency", currency: primaryCurrency })}`, margin + 5);
        }
        yPos += 5;
        
        // Expenses by Category
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        addText("Expenses by Category", margin);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        const sortedCategories = Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b.total - a.total);
        
        sortedCategories.forEach(([category, data], index) => {
          const percentage = totalPrimaryCurrency > 0 ? ((data.total / totalPrimaryCurrency) * 100).toFixed(1) : "0";
          addText(
            `${index + 1}. ${category}`,
            10,
            true,
            textColor,
            margin + 5
          );
          addText(
            `   Amount: ${data.total.toLocaleString("en-US", { style: "currency", currency: primaryCurrency })} • Transactions: ${data.count} • ${percentage}% of total`,
            margin + 10
          );
        });
        
        yPos += 5;
        
        // Expenses by Currency
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        addText("Multi-Currency Breakdown", margin);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        Object.entries(expensesByCurrency)
          .sort(([, a], [, b]) => b - a)
          .forEach(([currency, amount]) => {
            addText(
              `${currency}: ${amount.toLocaleString("en-US", { style: "currency", currency })}`,
              margin + 5
            );
          });
      }
      yPos += 5;
    }

    if (sectionSet.has("trips")) {
      addSectionHeader("Voyage Report");
      
      if (trips.length === 0) {
        addText("No trips were planned or completed within this date range.", 10);
      } else {
        // Voyage Statistics
        const completedTrips = trips.filter((t: { status: TripStatus }) => t.status === TripStatus.COMPLETED);
        const ongoingTrips = trips.filter((t: { status: TripStatus }) => t.status === TripStatus.ONGOING);
        const plannedTrips = trips.filter((t: { status: TripStatus }) => t.status === TripStatus.PLANNED);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        addText("Voyage Statistics", margin);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        addText(`Total Voyages: ${trips.length}`, margin + 5);
        addText(`Completed: ${completedTrips.length} • Ongoing: ${ongoingTrips.length} • Planned: ${plannedTrips.length}`, margin + 5);
        yPos += 5;
        
        // Individual Trip Details
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        addText("Voyage Details", margin);
        
        trips.forEach((trip: { name: string; code: string | null; status: TripStatus; startDate: Date; endDate: Date | null; departurePort: string | null; arrivalPort: string | null; createdBy: { name: string | null } | null; expenses: { amount: string | number; currency: string }[] }, index: number) => {
          if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          const tripTitle = trip.code ? `${trip.name} (${trip.code})` : trip.name;
          addText(`${index + 1}. ${tripTitle}`, margin + 5);
          
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          
          // Status badge
          const statusColors: Record<string, number[]> = {
            COMPLETED: [34, 197, 94],
            ONGOING: [59, 130, 246],
            PLANNED: [168, 85, 247],
            CANCELLED: [239, 68, 68],
          };
          const statusColor = statusColors[trip.status] || textColor;
          doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          addText(`Status: ${trip.status}`, margin + 10);
          
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          
          const startDateStr = format(new Date(trip.startDate), "MMM d, yyyy");
          const endDateStr = trip.endDate ? format(new Date(trip.endDate), "MMM d, yyyy") : "Ongoing";
          addText(`Period: ${startDateStr} → ${endDateStr}`, margin + 10);
          
          if (trip.departurePort || trip.arrivalPort) {
            const route = [trip.departurePort, trip.arrivalPort].filter(Boolean).join(" → ");
            if (route) addText(`Route: ${route}`, margin + 10);
          }
          
          if (trip.expenses && trip.expenses.length > 0) {
            const tripTotal = trip.expenses.reduce((sum: number, exp: { amount: string | number; currency: string }) => {
              return sum + Number(exp.amount);
            }, 0);
            addText(`Voyage Expenses: ${tripTotal.toLocaleString("en-US", { style: "currency", currency: primaryCurrency })} (${trip.expenses.length} transaction${trip.expenses.length !== 1 ? "s" : ""})`, margin + 10);
          }
          
          if (trip.createdBy?.name) {
            addText(`Created by: ${trip.createdBy.name}`, margin + 10);
          }
          
          yPos += 5;
        });
      }
      yPos += 5;
    }

    if (sectionSet.has("tasks")) {
      addSectionHeader("Maintenance & Tasks");
      
      if (completedTasks.length === 0) {
        addText("No tasks were completed within this date range.", 10);
      } else {
        // Task Statistics
        const tasksByType: Record<string, number> = {};
        completedTasks.forEach((task: { type: string }) => {
          const taskType = task.type || "GENERAL";
          tasksByType[taskType] = (tasksByType[taskType] || 0) + 1;
        });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        addText("Task Completion Summary", margin);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        addText(`Total Tasks Completed: ${completedTasks.length}`, margin + 5);
        
        if (Object.keys(tasksByType).length > 0) {
          addText("By Type:", margin + 5);
          Object.entries(tasksByType)
            .sort(([, a], [, b]) => b - a)
            .forEach(([type, count]) => {
              addText(`  • ${type}: ${count}`, margin + 10);
            });
        }
        yPos += 5;
        
        // Individual Task Details
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        addText("Completed Tasks", margin);
        
        completedTasks.forEach((task: { title: string; type: string; completedAt: Date | null; assignee: { name: string | null } | null; completedBy: { name: string | null } | null; trip: { name: string | null; code: string | null } | null }, index: number) => {
          if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          addText(`${index + 1}. ${task.title}`, margin + 5);
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(107, 114, 128);
          
          const details: string[] = [];
          if (task.type && task.type !== "GENERAL") {
            details.push(`Type: ${task.type}`);
          }
          if (task.completedAt) {
            details.push(`Completed: ${format(new Date(task.completedAt), "MMM d, yyyy 'at' HH:mm")}`);
          }
          if (task.assignee?.name) {
            details.push(`Assigned to: ${task.assignee.name}`);
          }
          if (task.completedBy?.name && task.completedBy.name !== task.assignee?.name) {
            details.push(`Verified by: ${task.completedBy.name}`);
          }
          if (task.trip?.name) {
            const tripLabel = task.trip.code ? `${task.trip.name} (${task.trip.code})` : task.trip.name;
            details.push(`Voyage: ${tripLabel}`);
          }
          
          if (details.length > 0) {
            addText(details.join(" • "), 9, false, undefined, margin + 10);
          }
          
          yPos += 3;
        });
      }
      yPos += 5;
    }

    if (sectionSet.has("shopping")) {
      addSectionHeader("Procurement Activity");
      
      if (completedShoppingLists.length === 0) {
        addText("No shopping lists were completed within this date range.", 10);
      } else {
        const totalItems = completedShoppingLists.reduce((sum: number, list: { _count: { items: number } }) => sum + list._count.items, 0);
        const avgItemsPerList = totalItems / completedShoppingLists.length;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        addText("Procurement Summary", margin);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        addText(`Total Lists Completed: ${completedShoppingLists.length}`, margin + 5);
        addText(`Total Items Processed: ${totalItems}`, margin + 5);
        addText(`Average Items per List: ${avgItemsPerList.toFixed(1)}`, margin + 5);
        yPos += 5;
        
        // Individual Shopping List Details
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        addText("Completed Shopping Lists", margin);
        
        completedShoppingLists.forEach((list: { name: string; description: string | null; _count: { items: number }; updatedAt: Date; createdBy: { name: string | null } | null; items: { name: string; quantity: number; unit: string | null }[] }, index: number) => {
          if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          addText(`${index + 1}. ${list.name}`, margin + 5);
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(107, 114, 128);
          
          const details: string[] = [];
          details.push(`${list._count.items} item${list._count.items !== 1 ? "s" : ""}`);
          details.push(`Completed: ${format(new Date(list.updatedAt), "MMM d, yyyy")}`);
          if (list.createdBy?.name) {
            details.push(`Created by: ${list.createdBy.name}`);
          }
          
          addText(details.join(" • "), 9, false, undefined, margin + 10);
          
          if (list.description) {
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            addText(`Description: ${list.description}`, 9, false, undefined, margin + 10);
          }
          
          yPos += 3;
        });
      }
      yPos += 5;
    }

    // Premium Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      
      // Footer text
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      
      const generatedDate = format(new Date(), "MMMM d, yyyy 'at' HH:mm");
      const footerText = `Generated on ${generatedDate} • HelmOps Operations Management System`;
      doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: "center" });
      
      // Page number
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 12, { align: "right" });
      
      // Confidential watermark (subtle)
      if (i === 1) {
        doc.setFontSize(60);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
        const watermarkText = sanitizeText(yacht?.name?.toUpperCase() || "CONFIDENTIAL");
        doc.text(
          watermarkText,
          pageWidth / 2,
          pageHeight / 2,
          { align: "center", angle: 45 }
        );
      }
    }

    const pdfArray = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfArray);
    const fileLabel = `operations-report-${format(startDate, "yyyyMMdd")}-${format(endDate, "yyyyMMdd")}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileLabel}"`,
      },
    });
  } catch (error) {
    console.error("Error generating operations report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
