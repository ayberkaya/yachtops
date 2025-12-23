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
      permissions?: string | null;
    };
    supabaseAccessToken: string;
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    yachtId: string | null;
    permissions?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    yachtId: string | null;
    permissions?: string | null;
    rememberMe?: boolean;
    supabaseAccessToken: string;
  }
}

declare module "next-auth" {
  interface User {
    rememberMe?: boolean;
  }
}

