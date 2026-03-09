import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      steamId: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    steamId?: string;
    profileUrl?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    steamId?: string;
  }
}
