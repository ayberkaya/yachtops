import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth-config";

// Export handlers directly for NextAuth v5
// Wrap in try-catch to ensure JSON responses on errors
export const GET = async (req: NextRequest) => {
  try {
    return await handlers.GET(req);
  } catch (error) {
    console.error("Auth GET error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    return await handlers.POST(req);
  } catch (error) {
    console.error("Auth POST error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

