"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface AdminUser {
  id: string;
  steamId: string;
  username: string;
  avatar: string;
  balance: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ userId: string; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setUsers(d);
      })
      .catch(() => setError("Failed to load"));
  }, []);

  async function addFunds(user: AdminUser) {
    const amount = parseInt(amounts[user.id] ?? "");
    if (!amount || isNaN(amount)) return;
    setLoading(user.id);
    setMsg(null);
    const res = await fetch("/api/admin/add-funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, amount }),
    });
    const data = await res.json();
    setLoading(null);
    if (res.ok) {
      setUsers(prev => prev?.map(u => u.id === user.id ? { ...u, balance: data.balance } : u) ?? null);
      setAmounts(prev => ({ ...prev, [user.id]: "" }));
      setMsg({ userId: user.id, text: `Balance updated to ${data.balance.toLocaleString()} ₱` });
    } else {
      setMsg({ userId: user.id, text: data.error ?? "Failed" });
    }
  }

  const filtered = users?.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.steamId.includes(search)
  ) ?? [];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400 font-bold text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-800/50 bg-[#0d0d15]/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-black text-white">
            Admin <span className="text-orange-500">Panel</span>
          </h1>
          <p className="text-gray-600 text-sm mt-1">Manage user balances</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <input
          type="text"
          placeholder="Search by username or Steam ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0d0d15] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 mb-6"
        />

        {users === null ? (
          <p className="text-gray-500 text-center py-12">Loading…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 mb-4">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map(user => (
              <div key={user.id} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-[#0d0d15] p-4">
                <Image src={user.avatar} alt={user.username} width={40} height={40} className="rounded-full border border-gray-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{user.username}</p>
                  <p className="text-xs text-gray-600">{user.steamId}</p>
                  <p className="text-sm font-black text-yellow-400 mt-0.5">{user.balance.toLocaleString()} ₱</p>
                  {msg?.userId === user.id && (
                    <p className="text-xs text-green-400 mt-1">{msg.text}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={amounts[user.id] ?? ""}
                    onChange={e => setAmounts(prev => ({ ...prev, [user.id]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addFunds(user)}
                    className="w-28 bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60"
                  />
                  <button
                    onClick={() => addFunds(user)}
                    disabled={loading === user.id || !amounts[user.id]}
                    className="px-4 py-2 text-sm font-black rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading === user.id ? "…" : "Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
