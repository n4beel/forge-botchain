import PageShell from "@/components/layout/PageShell";
import BotChainGate from "@/components/botchain/BotChainGate";
import ForgeForm from "@/components/forge/ForgeForm";
import { NAV } from "@/lib/nav";

export default function Home() {
  return (
    <PageShell
      nav={NAV}
      title="Deploy a token"
      description="A fixed-supply ERC-20 on BOT Chain, in one transaction. No Solidity, no compiler, no owner."
    >
      <BotChainGate>
        <ForgeForm />
      </BotChainGate>
    </PageShell>
  );
}
