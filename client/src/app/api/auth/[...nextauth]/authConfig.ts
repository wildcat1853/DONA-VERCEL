import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ].join(' ')
        }
      }
    })
  ],
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/auth`;
    },
  },
};

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    scope?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    scope?: string;
  }
}