"use client";

import { useEffect, useState } from "react";
import { formatUnits, type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import Panel from "@/components/ui/Panel";
import Spinner from "@/components/ui/Spinner";
import { addressUrl, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { tokenFactoryAbi } from "@/lib/botchain/abi";
import { groupDigits } from "@/lib/token";

type Forged = {
  token: Address;
  name: string;
  symbol: string;
  decimals: number;
  supply: bigint;
  block: bigint;
  hash: Hex;
};

/**
 * Every token this address has forged, read from logs rather than from storage.
 *
 * The factory deliberately keeps no list — an on-chain array would cost every user an SSTORE to
 * append to, for something only this screen reads. The cost of that choice is here: the scan needs
 * a start block, which is why a deployment without one is treated as unconfigured rather than
 * merely incomplete. Walking a chain with ~0.75s blocks from genesis is a hung tab, not a slow
 * scan.
 */
export default function TokenList() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  // wagmi memoises the public client per chain, so unlike a query result this identity is
  // genuinely stable across renders and is safe in a dependency array.
  const client = usePublicClient(); // stable-hook-result

  const [tokens, setTokens] = useState<Forged[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !address || !isBotChainId(chainId) || !isDeployed(chainId)) {
      setTokens(null);
      return;
    }

    let cancelled = false;
    setTokens(null);
    setError(null);

    const deployment = getDeployment(chainId);

    client
      .getContractEvents({
        address: deployment.address,
        abi: tokenFactoryAbi,
        eventName: "TokenForged",
        args: { creator: address },
        fromBlock: deployment.deployBlock,
        toBlock: "latest",
      })
      .then((logs) => {
        if (cancelled) return;
        setTokens(
          logs
            .map((log) => ({
              token: log.args.token as Address,
              name: log.args.name as string,
              symbol: log.args.symbol as string,
              decimals: Number(log.args.decimals),
              supply: log.args.supply as bigint,
              block: log.blockNumber,
              hash: log.transactionHash,
            }))
            // Newest first: the one just deployed is the one being looked for.
            .reverse(),
        );
      })
      .catch(() => {
        if (cancelled) return;
        // An empty list and an unreadable chain are different answers, and showing "no tokens"
        // for a failed query would tell someone their token had vanished.
        setError("Could not read the chain. This is unknown, not empty — reload to try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [client, address, chainId]);

  if (!isConnected) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Connect a wallet to see the tokens it has deployed.
        </p>
      </Panel>
    );
  }

  if (!isBotChainId(chainId) || !isDeployed(chainId)) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          No factory is configured for this network, so there is nothing to read.
        </p>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--warning)" }}>
          {error}
        </p>
      </Panel>
    );
  }

  if (tokens === null) {
    return (
      <Panel>
        <Spinner label="Reading the chain" />
      </Panel>
    );
  }

  if (tokens.length === 0) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          This address has not deployed a token yet.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tokens.map((token) => (
        <Panel key={token.token}>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {token.name}
              </span>
              <span className="font-mono text-[12px]" style={{ color: "var(--accent)" }}>
                {token.symbol}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] uppercase tracking-[0.06em]"
                style={{ color: "var(--text-secondary)" }}
              >
                Contract
              </span>
              <a
                href={addressUrl(chainId, token.token)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] break-all underline"
                style={{ color: "var(--text-primary)" }}
              >
                {token.token}
              </a>
            </div>

            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {groupDigits(formatUnits(token.supply, token.decimals))} {token.symbol} ·{" "}
              {token.decimals} decimals · block {token.block.toString()}
            </p>
          </div>
        </Panel>
      ))}
    </div>
  );
}
