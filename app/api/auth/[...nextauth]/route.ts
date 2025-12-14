import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth-config";

// Export handlers directly for NextAuth v5
// Wrap in try-catch to ensure JSON responses on errors
export const GET = async (req: NextRequest) => {
  try {
    const response = await handlers.GET(req);
    // Ensure response is properly formatted
    if (response && response instanceof Response) {
      return response;
    }
    // If handlers.GET returns something unexpected, wrap it
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth GET error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Auth GET error details:", { errorMessage, errorStack });
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: errorMessage 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const response = await handlers.POST(req);
    // Ensure response is properly formatted
    if (response && response instanceof Response) {
      return response;
    }
    // If handlers.POST returns something unexpected, wrap it
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth POST error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Auth POST error details:", { errorMessage, errorStack });
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: errorMessage 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

