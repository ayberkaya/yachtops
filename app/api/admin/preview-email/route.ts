import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { getModernWelcomeEmailHtml } from "@/utils/mail";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      yachtName,
      ownerName,
      planName,
      planId,
      languagePreference,
      logoUrl,
      planFeatures = [],
    } = body;

    if (!yachtName || !ownerName || !planName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If planId is provided but no features, fetch them
    let features = planFeatures;
    if (planId && (!features || features.length === 0)) {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: planData } = await supabase
          .from("plans")
          .select("features")
          .eq("id", planId)
          .single();

        if (planData?.features) {
          features = Array.isArray(planData.features)
            ? planData.features
            : typeof planData.features === "object"
            ? Object.values(planData.features)
            : [];
        }
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const mockToken = "preview_verification_token";
    const verificationLink = `${appUrl}/verify-email?token=${mockToken}`;

    const html = await getModernWelcomeEmailHtml(
      yachtName,
      ownerName,
      planName,
      verificationLink,
      logoUrl || null,
      languagePreference || "en",
      "support@helmops.com",
      features
    );

    return NextResponse.json({ html });
  } catch (error) {
    console.error("Error generating email preview:", error);
    return NextResponse.json(
      { error: "Failed to generate email preview" },
      { status: 500 }
    );
  }
}

