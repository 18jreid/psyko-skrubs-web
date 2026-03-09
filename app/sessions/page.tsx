export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionsClient from "./SessionsClient";

async function getSessions() {
  const sessions = await prisma.gamingSession.findMany({
    orderBy: { scheduledAt: "asc" },
    include: {
      createdBy: { select: { id: true, username: true, avatar: true } },
      rsvps: {
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
    },
  });

  return sessions.map((s) => ({
    ...s,
    scheduledAt: s.scheduledAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    rsvps: s.rsvps.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  }));
}

export default async function SessionsPage() {
  const [sessions, session] = await Promise.all([
    getSessions(),
    getServerSession(authOptions),
  ]);

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-black text-white">
            Game <span className="text-orange-500">Sessions</span>
          </h1>
          <p className="text-gray-500 mt-1">Plan sessions and RSVP with the squad</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SessionsClient
          initialSessions={sessions}
          userId={session?.user?.id ?? null}
          userName={session?.user?.name ?? null}
        />
      </div>
    </div>
  );
}
