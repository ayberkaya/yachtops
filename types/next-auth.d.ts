import { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      yachtId: string | null;
      tenantId?: string | null; // alias for yachtId (backward compatibility)
      permissions?: string | null;
      impersonatedBy?: string; // present when an admin is impersonating another user
    };
    supabaseAccessToken: string;
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    yachtId: string | null;
    tenantId?: string | null; // alias for yachtId (backward compatibility)
    permissions?: string | null;
    impersonatedBy?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    yachtId: string | null;
    tenantId?: string | null;
    permissions?: string | null;
    rememberMe?: boolean;
    supabaseAccessToken: string;
    impersonatedBy?: string; // Admin user ID who is impersonating
  }
}

declare module "next-auth" {
  interface User {
    rememberMe?: boolean;
  }
}

