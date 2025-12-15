import { NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error("VAPID_PUBLIC_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ publicKey });
  } catch (error) {
    console.error("Error getting VAPID public key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

