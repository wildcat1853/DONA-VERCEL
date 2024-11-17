import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authConfig: NextAuthOptions = {
  debug: true,
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
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ].join(' ')
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      console.log('JWT Callback:', { hasAccount: !!account, hasUser: !!user });
      
      if (account) {
        token.accessToken = account.access_token;
        console.log('Setting access token in JWT:', !!account.access_token);
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback:', { 
        hasToken: !!token, 
        hasAccessToken: !!token.accessToken 
      });
      
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};