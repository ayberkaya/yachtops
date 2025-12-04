import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Check if any users already exist
    const userCount = await db.user.count();
    
    return NextResponse.json({
      open: userCount === 0,
      message: userCount === 0 
        ? "Registration is open" 
        : "Registration is closed. Please sign in instead.",
    });
  } catch (error) {
    console.error("Error checking registration status:", error);
    return NextResponse.json(
      { open: true, message: "Unable to check registration status" },
      { status: 500 }
    );
  }
}

