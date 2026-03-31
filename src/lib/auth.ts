import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "./mongodb";
import { User } from "./models/User";
import "./models/Role"; // required so Mongoose registers the Role schema for .populate()
import "./models/Organization"; // ensure Organization schema is registered
import { Organization } from "./models/Organization";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@flowspace.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        await dbConnect();

        const user = await User.findOne({ email: credentials.email }).populate('role_id').exec();

        if (!user || !user.passwordHash) {
          throw new Error("User not found");
        }
        if (user.organization_id && (user.organization_id as any).status === "SUSPENDED") {
          throw new Error("Your organization's account has been suspended. Please contact support.");
        }

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordCorrect) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role_id,
          userType: user.user_type,
          orgId: user.organization_id ? user.organization_id.toString() : null,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.picture = user.image;
        token.userType = (user as any).userType;
        token.orgId = (user as any).orgId ?? null;
      }

      // Allow manual session update triggered from the client (e.g. after profile edit)
      if (trigger === "update" && session?.image) {
        token.picture = session.image;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).userType = token.userType as string;
        (session.user as any).orgId = token.orgId as string | null;
        session.user.image = token.picture as string || null;
      }


      if (token.orgId) {
        await dbConnect();
        const org = await Organization.findById(token.orgId).select("status").lean();
        if (org && org.status === "SUSPENDED") {
          session.user = undefined as any;
          (session as any).error = "SUSPENDED";
        }


      }
      // console.log("inside here")
      return session;
    }
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

