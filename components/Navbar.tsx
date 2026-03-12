"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";

const PRIMARY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/clips", label: "Clips" },
  { href: "/rankings", label: "Rankings" },
];

const MORE_LINKS = [
  { href: "/team", label: "Team" },
  { href: "/steam", label: "Steam" },
  { href: "/cases", label: "Cases" },
  { href: "/slots", label: "Slots" },
  { href: "/plinko", label: "Plinko" },
  { href: "/market", label: "Market" },
  { href: "/sessions", label: "Sessions" },
  { href: "/compare", label: "Compare" },
  { href: "/achievements", label: "Achievements" },
  { href: "/chat", label: "Chat" },
  { href: "/requests", label: "Requests" },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS];

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-orange-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-orange-500 rounded-sm flex items-center justify-center font-black text-black text-sm">
              PS
            </div>
            <span className="font-black text-xl tracking-wider text-white group-hover:text-orange-400 transition-colors">
              PSYKO <span className="text-orange-500">SKRUBS</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {PRIMARY_LINKS.map(({ href, label }) => (
              <NavLink key={href} href={href}>{label}</NavLink>
            ))}

            {/* More dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className="flex items-center gap-1 text-gray-400 hover:text-orange-400 text-sm font-medium uppercase tracking-wider transition-colors"
              >
                More
                <svg className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute top-full left-0 mt-2 w-44 bg-[#0d0d15] border border-gray-800 rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50">
                  {MORE_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className="block px-4 py-2.5 text-sm text-gray-400 hover:text-orange-400 hover:bg-gray-800/50 transition-colors font-medium"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-3">
                <Link href={`/profile/${session.user.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "Avatar"}
                      width={32}
                      height={32}
                      className="rounded-full border-2 border-orange-500/50"
                    />
                  )}
                  <span className="text-sm text-gray-300 font-medium">
                    {session.user.name}
                  </span>
                </Link>
                <NotificationBell />
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-400/50 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                href="/api/auth/steam"
                className="flex items-center gap-2 px-4 py-2 bg-[#1b2838] hover:bg-[#2a475e] border border-[#4c6b8a] text-white text-sm font-medium rounded transition-colors"
              >
                <SteamIcon />
                Sign in with Steam
              </a>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <div className="w-5 h-0.5 bg-current mb-1.5" />
            <div className="w-5 h-0.5 bg-current mb-1.5" />
            <div className="w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0d0d15] border-t border-orange-500/20">
          <div className="px-4 py-3 space-y-3">
            {ALL_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block text-gray-300 hover:text-orange-400 font-medium uppercase tracking-wider transition-colors"
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-800">
              {session ? (
                <div className="space-y-2">
                  <Link href={`/profile/${session.user.id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {session.user.image && (
                      <Image
                        src={session.user.image}
                        alt="Avatar"
                        width={28}
                        height={28}
                        className="rounded-full border border-orange-500/50"
                      />
                    )}
                    <span className="text-sm text-gray-300">{session.user.name}</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <a
                  href="/api/auth/steam"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                >
                  <SteamIcon />
                  Sign in with Steam
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-gray-400 hover:text-orange-400 text-sm font-medium uppercase tracking-wider transition-colors"
    >
      {children}
    </Link>
  );
}

function SteamIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  );
}
