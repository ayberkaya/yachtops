import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseStatus, ShoppingListStatus, TaskStatus, TripStatus } from "@prisma/client";
import { jsPDF } from "jspdf";
import { endOfDay, format, isValid, parseISO, startOfDay } from "date-fns";
import { getTenantId, isPlatformAdmin } from "@/lib/tenant";

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

    const tenantId = getTenantId(session);
    const isAdmin = isPlatformAdmin(session);
    if (!tenantId && !isAdmin) {
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

    const yacht = await db.yacht.findUnique({
      where: { id: tenantId || undefined },
    });

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

    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    const addText = (
      text: string,
      fontSize: number = 10,
      isBold: boolean = false,
      color: number[] = [0, 0, 0]
    ) => {
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

    const periodLabel = `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 184, 166);
    doc.text("⚓ HelmOps", margin, 15);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Operations Report", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    doc.setFontSize(14);
    doc.text(yacht?.name || "Helm Operations", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${periodLabel}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    if (sectionSet.has("summary")) {
      addSectionHeader("Executive Summary");
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      addText(`Date range: ${periodLabel}`);
      addText(`Approved expenses: ${expenses.length} transactions`);
      if (totalPrimaryCurrency > 0) {
        addText(
          `Total expense amount (${primaryCurrency}): ${totalPrimaryCurrency.toLocaleString("en-US", {
            style: "currency",
            currency: primaryCurrency,
          })}`
        );
      }
      addText(
        `Trips touching this range: ${trips.length} (${trips.filter((t) => t.status === TripStatus.COMPLETED).length} completed)`
      );
      addText(`Completed tasks: ${completedTasks.length}`);
      addText(`Completed shopping lists: ${completedShoppingLists.length}`);
      yPos += 5;
    }

    if (sectionSet.has("financial")) {
      addSectionHeader("Financial Overview");
      if (expenses.length === 0) {
        addText("No approved expenses recorded in the selected date range.");
      } else {
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
      }
      yPos += 5;
    }

    if (sectionSet.has("trips")) {
      addSectionHeader("Trips");
      if (trips.length === 0) {
        addText("No trips were planned or completed within this date range.");
      } else {
        trips.forEach((trip) => {
          addText(`${trip.name} (${trip.status})`, 10, true);
          addText(
            `  Dates: ${format(new Date(trip.startDate), "MMM d")} - ${
              trip.endDate ? format(new Date(trip.endDate), "MMM d, yyyy") : "Ongoing"
            }`
          );
          if (trip.departurePort) addText(`  From: ${trip.departurePort}`);
          if (trip.arrivalPort) addText(`  To: ${trip.arrivalPort}`);
          if (trip.createdBy?.name) addText(`  Created by: ${trip.createdBy.name}`);
          yPos += 3;
        });
      }
      yPos += 5;
    }

    if (sectionSet.has("tasks")) {
      addSectionHeader("Completed Tasks");
      if (completedTasks.length === 0) {
        addText("No tasks were completed within this date range.");
      } else {
        completedTasks.forEach((task) => {
          addText(task.title, 10, true);
          const details: string[] = [];
          if (task.completedAt) {
            details.push(`Completed: ${format(new Date(task.completedAt), "MMM d, yyyy HH:mm")}`);
          }
          if (task.assignee?.name) {
            details.push(`Assignee: ${task.assignee.name}`);
          }
          if (task.completedBy?.name) {
            details.push(`Checked by: ${task.completedBy.name}`);
          }
          if (task.trip?.name) {
            details.push(`Trip: ${task.trip.name}`);
          }
          details.forEach((detail) => addText(`  ${detail}`));
          yPos += 3;
        });
      }
      yPos += 5;
    }

    if (sectionSet.has("shopping")) {
      addSectionHeader("Shopping Lists");
      if (completedShoppingLists.length === 0) {
        addText("No shopping lists were completed within this date range.");
      } else {
        const totalItems = completedShoppingLists.reduce((sum, list) => sum + list._count.items, 0);
        addText(`Total lists completed: ${completedShoppingLists.length}`);
        addText(`Total items processed: ${totalItems}`);
        completedShoppingLists.forEach((list) => {
          addText(list.name, 10, true);
          if (list.description) {
            addText(`  ${list.description}`);
          }
          const shoppingDetails: string[] = [];
          shoppingDetails.push(`Items: ${list._count.items}`);
          shoppingDetails.push(`Completed on: ${format(new Date(list.updatedAt), "MMM d, yyyy")}`);
          if (list.createdBy?.name) {
            shoppingDetails.push(`Created by: ${list.createdBy.name}`);
          }
          shoppingDetails.forEach((detail) => addText(`  ${detail}`));
          yPos += 3;
        });
      }
      yPos += 5;
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Generated on ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")} • HelmOps`,
        pageWidth / 2,
        285,
        { align: "center" }
      );
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
