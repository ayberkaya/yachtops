import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { resolveTenantOrResponse } from "@/lib/api-tenant";
import { generateReport, ReportFilters } from "@/actions/reports";

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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeDraft = searchParams.get("includeDraft") === "true";

    const filters: ReportFilters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      includeDraft,
    };

    const result = await generateReport(filters);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to generate report" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[GET /api/reports/monthly] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

