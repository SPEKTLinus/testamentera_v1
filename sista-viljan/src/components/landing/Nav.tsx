"use client";

import Link from "next/link";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e5e5e5]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-heading text-lg font-semibold text-ink tracking-tight">
          Sista Viljan
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="#hur-det-fungerar"
            className="hidden md:block text-sm text-[#4a5568] hover:text-ink transition-colors"
          >
            Hur det fungerar
          </Link>
          <Link
            href="#pris"
            className="hidden md:block text-sm text-[#4a5568] hover:text-ink transition-colors"
          >
            Pris
          </Link>
          <Link
            href="#fragor"
            className="hidden md:block text-sm text-[#4a5568] hover:text-ink transition-colors"
          >
            Vanliga frågor
          </Link>
          <Link
            href="/app"
            className="btn-primary text-sm py-2.5 px-5"
          >
            Kom igång
          </Link>
        </div>
      </div>
    </nav>
  );
}
