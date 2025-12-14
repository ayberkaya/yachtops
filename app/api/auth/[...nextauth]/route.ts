import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth-config";

// Export handlers directly for NextAuth v5
// Wrap in try-catch to ensure JSON responses on errors
export const GET = async (req: NextRequest) => {
  try {
    const response = await handlers.GET(req);
    // Ensure response is properly formatted
    if (response && response instanceof Response) {
      // Check if response is already JSON
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return response;
      }
      // If it's an error response, ensure it's JSON
      if (response.status >= 400) {
        try {
          // Clone the response to read it without consuming the original
          const clonedResponse = response.clone();
          const text = await clonedResponse.text();
          // If it's already JSON, return the original response
          try {
            JSON.parse(text);
            return response;
          } catch {
            // If not JSON, wrap it in JSON
            return new Response(
              JSON.stringify({ 
                error: "Internal Server Error", 
                message: text || "An error occurred"
              }),
              {
                status: response.status,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        } catch {
          return new Response(
            JSON.stringify({ 
              error: "Internal Server Error", 
              message: "An error occurred"
            }),
            {
              status: response.status || 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
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

