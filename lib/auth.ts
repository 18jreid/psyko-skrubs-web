import { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (token.steamId) {
        session.user.steamId = token.steamId as string;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { steamId: token.steamId as string },
            select: { id: true, username: true, avatar: true },
          });
          if (dbUser) {
            session.user.id = dbUser.id;
            session.user.name = dbUser.username;
            session.user.image = dbUser.avatar;
          }
        } catch {
          // DB might not be available during build
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
