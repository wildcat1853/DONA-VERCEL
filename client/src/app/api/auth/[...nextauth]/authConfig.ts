import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authConfig: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      console.log("JWT Callback - Raw Data:", { 
        hasAccount: !!account,
        accountScopes: account?.scope,
        accessToken: !!account?.access_token,
        tokenData: token
      });
      
      if (account) {
        token.accessToken = account.access_token;
        token.scope = account.scope;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback - Token Data:", { 
        hasToken: !!token, 
        hasAccessToken: !!token.accessToken,
        scope: token.scope
      });
      
      session.accessToken = token.accessToken;
      session.scope = token.scope;
      return session;
    }
  },
  debug: true
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