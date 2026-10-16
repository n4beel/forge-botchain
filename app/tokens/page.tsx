import PageShell from "@/components/layout/PageShell";
import TokenList from "@/components/forge/TokenList";
import { NAV } from "@/lib/nav";

export const metadata = {
  title: "Your tokens — Forge",
  description: "Every token this address has deployed on BOT Chain.",
};

export default function Tokens() {
  return (
    <PageShell
      nav={NAV}
      title="Your tokens"
      description="Read from the chain's own logs, not from a database."
    >
      <TokenList />
    </PageShell>
  );
}
