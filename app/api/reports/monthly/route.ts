import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseStatus, TripStatus, TaskStatus, ShoppingListStatus } from "@prisma/client";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
      return NextResponse.json(
        { error: "User must be assigned to a tenant" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get yacht info
    const yacht = await db.yacht.findUnique({
      where: { id: tenantId || undefined },
    });

    // Get approved expenses for the month
    const expenses = await db.expense.findMany({
      where: {
        yachtId: tenantId || undefined,
        status: ExpenseStatus.APPROVED,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        trip: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    // Get trips for the month
    const trips = await db.trip.findMany({
      where: {
        yachtId: tenantId || undefined,
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
      },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    });

    // Get completed tasks for the month
    const completedTasks = await db.task.findMany({
      where: {
        yachtId: tenantId || undefined,
        status: TaskStatus.DONE,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        completedBy: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        trip: { select: { name: true } },
      },
      orderBy: { completedAt: "desc" },
    });

    // Get completed shopping lists
    const completedShoppingLists = await db.shoppingList.findMany({
      where: {
        yachtId: tenantId || undefined,
        status: ShoppingListStatus.COMPLETED,
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    });


    // Calculate expense totals by category
    const expensesByCategory: Record<string, number> = {};
    const expensesByCurrency: Record<string, number> = {};
    const primaryCurrency = "EUR";

    expenses.forEach((exp) => {
      const amount = Number(exp.amount);
      const categoryName = exp.category.name;
      const currency = exp.currency;

      expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + amount;
      expensesByCurrency[currency] = (expensesByCurrency[currency] || 0) + amount;
    });

    const totalPrimaryCurrency = expensesByCurrency[primaryCurrency] || 0;

    // Create PDF
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Helper function to add text with auto page break
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: number[] = [0, 0, 0]) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * (fontSize * 0.4) + 5;
    };

    // Helper function to add section header
    const addSectionHeader = (text: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(text, margin, yPos);
      doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
      yPos += 10;
    };

    // Header with subtle logo
    // Small logo/icon in top left
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 184, 166); // teal-500
    doc.text("⚓ YachtOps", margin, 15);
    doc.setTextColor(0, 0, 0); // Reset to black
    
    // Main title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Operations Report", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    doc.setFontSize(14);
    doc.text(yacht?.name || "Yacht Operations", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${format(startDate, "MMMM yyyy")}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Executive Summary
    addSectionHeader("Executive Summary");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    addText(`Total Approved Expenses: ${expenses.length} transactions`);
    if (totalPrimaryCurrency > 0) {
      addText(
        `Total Expense Amount (${primaryCurrency}): ${totalPrimaryCurrency.toLocaleString("en-US", {
          style: "currency",
          currency: primaryCurrency,
        })}`
      );
    }
    addText(`Trips: ${trips.length} (${trips.filter((t) => t.status === TripStatus.COMPLETED).length} completed)`);
    addText(`Completed Shopping Lists: ${completedShoppingLists.length}`);
    yPos += 5;

    // Financial Overview
    addSectionHeader("Financial Overview");
    addText("Expenses by Category:", 12, true);
    Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, amount]) => {
        addText(`${category}: ${amount.toLocaleString("en-US", { style: "currency", currency: "EUR" })}`);
      });
    yPos += 5;
    addText("Expenses by Currency:", 12, true);
    Object.entries(expensesByCurrency)
      .sort(([, a], [, b]) => b - a)
      .forEach(([currency, amount]) => {
        addText(`${currency}: ${amount.toLocaleString("en-US", { style: "currency", currency })}`);
      });
    yPos += 5;

    // Trips
    if (trips.length > 0) {
      addSectionHeader("Trips");
      trips.forEach((trip) => {
        addText(`${trip.name} (${trip.status})`, 10, true);
        addText(`  Dates: ${format(new Date(trip.startDate), "MMM d")} - ${trip.endDate ? format(new Date(trip.endDate), "MMM d, yyyy") : "Ongoing"}`);
        if (trip.departurePort) addText(`  From: ${trip.departurePort}`);
        if (trip.arrivalPort) addText(`  To: ${trip.arrivalPort}`);
        yPos += 3;
      });
      yPos += 5;
    }

    // Shopping Lists
    if (completedShoppingLists.length > 0) {
      addSectionHeader("Completed Shopping Lists");
      addText(`Total Lists Completed: ${completedShoppingLists.length}`);
      addText(`Total Items: ${completedShoppingLists.reduce((sum, list) => sum + list._count.items, 0)}`);
      yPos += 5;
    }


    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(
        `Generated on ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")} • YachtOps`,
        pageWidth / 2,
        285,
        { align: "center" }
      );
    }

    // Generate PDF buffer
    const pdfArray = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfArray);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="monthly-report-${year}-${month.toString().padStart(2, "0")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating monthly report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
