import "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    };
    accessToken?: string;
    refreshToken?: string;
    scope?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    };
    accessToken?: string;
    refreshToken?: string;
    scope?: string;
  }
} 