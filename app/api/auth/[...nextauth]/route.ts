import { handlers } from "@/lib/auth-config";

// Export handlers directly for NextAuth v5
// NextAuth v5 handles errors internally and returns proper JSON responses
export const { GET, POST } = handlers;
