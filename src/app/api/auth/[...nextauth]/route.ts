import { ENV } from "@/lib/env";
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: ENV.GOOGLE_ID,
      clientSecret: ENV.GOOGLE_SECRET,
    }),
    // ...add more providers here
  ],
};
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
