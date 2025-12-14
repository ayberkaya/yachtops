import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth-config";

// Export handlers directly for NextAuth v5
// Wrap in try-catch to ensure JSON responses on errors
export const GET = async (req: NextRequest) => {
  try {
    const response = await handlers.GET(req);
    
    // Ensure response is a Response object
    if (!(response instanceof Response)) {
      return new Response(JSON.stringify(response || {}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // For session endpoint specifically, always ensure JSON response
    const url = new URL(req.url);
    if (url.pathname.includes("/session")) {
      // If it's an error response, ensure it's JSON
      if (response.status >= 400) {
        let errorText = "An error occurred";
        try {
          const cloned = response.clone();
          const text = await cloned.text();
          // Try to parse as JSON first
          try {
            const json = JSON.parse(text);
            // If it's already valid JSON, return as is
            return response;
          } catch {
            // If not JSON, use the text as error message
            errorText = text || errorText;
          }
        } catch {
          // If we can't read the response, use default message
        }
        
        return new Response(
          JSON.stringify({ 
            error: "Internal Server Error", 
            message: errorText 
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      // For successful session responses, ensure JSON content type
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        // If not JSON, try to read and re-wrap
        try {
          const cloned = response.clone();
          const text = await cloned.text();
          try {
            // If it's already valid JSON, just fix the content-type header
            JSON.parse(text);
            const newHeaders = new Headers(response.headers);
            newHeaders.set("Content-Type", "application/json");
            return new Response(text, {
              status: response.status,
              headers: newHeaders,
            });
          } catch {
            // If not JSON, wrap it
            return new Response(
              JSON.stringify({ 
                error: "Invalid response format",
                message: "Session endpoint returned non-JSON response"
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        } catch {
          // If we can't read it, return a safe JSON response
          return new Response(
            JSON.stringify({ 
              error: "Internal Server Error",
              message: "Unable to process session response"
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    }
    
    return response;
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

