import type { AuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUser, upgradePassword, verifyPassword } from "@/lib/userStore";

export const authOptions: AuthOptions = {
  // Required in production on Vercel. Falling back keeps local dev working.
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await getUser(credentials.username);
        if (!user) return null;

        const valid = await verifyPassword(user, credentials.password);
        if (!valid) return null;

        // Upgrade legacy plaintext passwords to bcrypt on successful login.
        await upgradePassword(user, credentials.password).catch(() => {});

        return {
          id: user.id,
          name: user.username,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
