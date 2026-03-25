import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: any;
      userType: string;
      orgId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: any;
    userType: string;
    orgId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: any;
    userType: string;
    orgId: string | null;
  }
}
