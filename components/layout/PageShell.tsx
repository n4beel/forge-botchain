"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

export type NavItem = { href: string; label: string };

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavItem[];
  title?: string;
  description?: string;
}

/**
 * Console shell: full-bleed, dense, one inline bar.
 *
 * No centred measure and no card — the page runs edge to edge with a hairline-separated status
 * bar across the top, the way a build tool does. The title sits inline with the route rather than
 * in a hero, because the interesting output here is an address, not a headline.
 */
export default function PageShell({ children, nav = [], title, description }: PageShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <header
        className="sticky top-0 z-30 flex items-center gap-4 px-4 md:px-6 h-12 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--border-default)",
          background: "rgba(12,13,15,0.92)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline flex-shrink-0">
          <svg aria-hidden="true" viewBox="0 0 100 100" style={{ width: "16px", height: "16px" }}>
            <path d="M50 14 L84 78 H16 Z" fill="var(--accent)" />
            <path d="M50 40 L66 70 H34 Z" fill="var(--bg-base)" />
          </svg>
          <span className="mono text-[14px] font-semibold tracking-[-0.02em]">{app.name}</span>
        </Link>

        <span style={{ color: "var(--text-tertiary)" }} className="mono text-[13px] hidden sm:inline">
          /
        </span>

        {nav.length > 0 && (
          <nav className="flex items-center gap-4 overflow-x-auto">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="nav-link mono text-[13px] no-underline whitespace-nowrap"
                  style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
                >
                  {item.label.toLowerCase().replace(/\s+/g, "-")}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex-1" />
        <NetworkBadge />
        <div className="w-[150px] md:w-[170px] flex-shrink-0">
          <ConnectButton />
        </div>
      </header>

      <main className="flex-1 w-full px-4 md:px-6 py-6">
        {(title || description) && (
          <div
            className="mb-6 pb-4 flex flex-col gap-1"
            style={{ borderBottom: "1px dashed var(--border-default)" }}
          >
            {title && (
              <h1 className="mono text-[20px]" style={{ color: "var(--text-primary)" }}>
                {title}
              </h1>
            )}
            {description && (
              <p className="text-[13px]" style={{ color: "var(--text-secondary)", maxWidth: "68ch" }}>
                {description}
              </p>
            )}
          </div>
        )}
        <div className="mx-auto w-full" style={{ maxWidth: "1040px" }}>
          {children}
        </div>
      </main>

      <footer
        className="w-full px-4 md:px-6 py-4 flex flex-wrap items-center gap-x-5 gap-y-2"
        style={{ borderTop: "1px solid var(--border-default)" }}
      >
        <span className="mono text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {app.tagline}
        </span>
        <div className="flex-1" />
        <BuiltOnBotChain
          className="mono text-[12px]"
          style={{ color: "var(--text-secondary)" }}
          label="built on BOT Chain"
        />
        <a href="https://botchain.ai" target="_blank" rel="noreferrer" className="mono text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          botchain.ai
        </a>
        <a href="https://scan.botchain.ai" target="_blank" rel="noreferrer" className="mono text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          scan.botchain.ai
        </a>
      </footer>
    </div>
  );
}
