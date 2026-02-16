import NextAuth from "next-auth/next";
import { Session, AuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUser } from "@/lib/userStore";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      authorize: async (credentials) => {
        if (!credentials) return null;

        const user = await getUser(credentials.username);
        if (!user) return null;

        if (user.password !== credentials.password) return null;

        return {
          id: user.id,
          name: user.username,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt" as const,
  },

  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} as AuthOptions;

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
