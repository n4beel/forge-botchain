"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseError, ContractFunctionRevertedError, decodeEventLog, type Hex } from "viem";
import { useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import TxStatus, { type TxStage } from "@/components/ui/TxStatus";
import { useToast } from "@/components/ui/Toast";
import { addressUrl, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { tokenFactoryAbi } from "@/lib/botchain/abi";
import {
  byteLength,
  groupDigits,
  MAX_DECIMALS,
  MAX_NAME_BYTES,
  MAX_SYMBOL_BYTES,
  parseSupply,
  validateDraft,
  type TokenDraft,
} from "@/lib/token";

/**
 * The one transaction this app exists to make.
 *
 * The form mirrors the contract's guards so a user is not asked to pay gas to be told no, but the
 * contract stays the authority — its reverts are still decoded, because a form that believes it
 * has covered every case is how a mismatch goes unnoticed.
 */
export default function ForgeForm() {
  const chainId = useChainId();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [draft, setDraft] = useState<TokenDraft>({
    name: "",
    symbol: "",
    decimals: 18,
    supply: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof TokenDraft, boolean>>>({});
  const [stage, setStage] = useState<TxStage>("idle");
  const [hash, setHash] = useState<Hex | null>(null);
  const [token, setToken] = useState<Hex | null>(null);

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;

  const problems = useMemo(() => validateDraft(draft), [draft]);
  const problemFor = (field: keyof TokenDraft) =>
    touched[field] ? problems.find((p) => p.field === field)?.message : undefined;

  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: Boolean(hash) },
  });

  // One settlement per transaction, keyed by its hash. A boolean like `isSuccess` stays true for
  // every later render, so anything with a side effect behind it would fire repeatedly.
  const settled = useRef<Hex | null>(null);

  useEffect(() => {
    if (!hash || settled.current === hash) return;
    if (!receipt.isSuccess && !receipt.isError) return;
    settled.current = hash;

    if (receipt.isError) {
      setStage("failed");
      toast("error", "Deployment failed", "No token was created.");
      return;
    }

    // The token's address comes from the log rather than from the call's return value: a
    // transaction receipt carries logs, not return data, so this is the only place it exists
    // on chain.
    let deployed: Hex | null = null;
    for (const log of receipt.data?.logs ?? []) {
      try {
        const parsed = decodeEventLog({ abi: tokenFactoryAbi, ...log });
        if (parsed.eventName === "TokenForged") deployed = parsed.args.token;
      } catch {
        // Logs from anything else in the transaction. Not ours, not a problem.
      }
    }

    setToken(deployed);
    setStage("confirmed");
    toast("success", "Token deployed", "The entire supply is in your wallet.");
  }, [hash, receipt.isSuccess, receipt.isError, receipt.data, toast]);

  const handleForge = useCallback(async () => {
    if (!deployment || !isBotChainId(chainId) || problems.length > 0) return;

    const supply = parseSupply(draft.supply, draft.decimals);
    if (supply === null) return;

    setStage("signing");
    setHash(null);
    setToken(null);
    settled.current = null;

    try {
      const txHash = await writeContractAsync({
        address: deployment.address,
        abi: tokenFactoryAbi,
        functionName: "forge",
        args: [draft.name.trim(), draft.symbol.trim(), draft.decimals, supply],
        chainId,
      });
      setHash(txHash);
      setStage("pending");
    } catch (err) {
      setStage("idle");

      const reverted =
        err instanceof BaseError ? err.walk((e) => e instanceof ContractFunctionRevertedError) : null;
      if (reverted instanceof ContractFunctionRevertedError) {
        toast(
          "error",
          "The contract refused this token",
          reverted.data?.errorName ?? "It did not say why.",
        );
        return;
      }

      const message = err instanceof BaseError ? err.shortMessage : "Something went wrong.";
      if (/rejected|denied/i.test(message)) toast("info", "Cancelled", "Nothing was deployed.");
      else toast("error", "Could not deploy", message);
    }
  }, [deployment, chainId, draft, problems, writeContractAsync, toast]);

  if (stage === "confirmed") {
    return (
      <Panel>
        <div className="flex flex-col gap-4">
          <TxStatus stage="confirmed" hash={hash} confirmedLabel="Token deployed" />

          {token && (
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] uppercase tracking-[0.06em]"
                style={{ color: "var(--text-secondary)" }}
              >
                Contract address
              </span>
              <a
                href={addressUrl(chainId, token)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] break-all underline"
                style={{ color: "var(--accent)" }}
              >
                {token}
              </a>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                Add this address to your wallet as a custom token to see the balance. The entire
                supply of {groupDigits(draft.supply)} {draft.symbol.trim()} is already yours — no
                further transaction is needed, and no more can ever be created.
              </p>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => {
              setStage("idle");
              setHash(null);
              setToken(null);
              setDraft({ name: "", symbol: "", decimals: 18, supply: "" });
              setTouched({});
            }}
          >
            Forge another
          </Button>
        </div>
      </Panel>
    );
  }

  const busy = stage === "signing" || stage === "pending";

  return (
    <Panel>
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onBlur={() => setTouched({ ...touched, name: true })}
          placeholder="Acme Token"
          disabled={busy}
          error={problemFor("name")}
          hint={`${byteLength(draft.name)} of ${MAX_NAME_BYTES} bytes`}
        />

        <Input
          label="Symbol"
          value={draft.symbol}
          onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })}
          onBlur={() => setTouched({ ...touched, symbol: true })}
          placeholder="ACME"
          mono
          disabled={busy}
          error={problemFor("symbol")}
          hint={`${byteLength(draft.symbol)} of ${MAX_SYMBOL_BYTES} bytes`}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Decimals"
            type="number"
            min={0}
            max={MAX_DECIMALS}
            value={String(draft.decimals)}
            onChange={(e) => setDraft({ ...draft, decimals: Number(e.target.value) })}
            onBlur={() => setTouched({ ...touched, decimals: true })}
            disabled={busy}
            error={problemFor("decimals")}
            hint="18 is standard"
          />

          <Input
            label="Total supply"
            value={draft.supply}
            onChange={(e) => setDraft({ ...draft, supply: e.target.value })}
            onBlur={() => setTouched({ ...touched, supply: true })}
            placeholder="1000000"
            mono
            disabled={busy}
            error={problemFor("supply")}
            hint={
              parseSupply(draft.supply, draft.decimals) !== null
                ? `${groupDigits(draft.supply.trim())} tokens, fixed forever`
                : "Can never change"
            }
          />
        </div>

        {/* Stated before the signature, not after. Nothing here can mint, burn, pause or seize,
            and a user should know that is the deal before they pay for it. */}
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}
        >
          The supply is minted to you and fixed forever. The token has no owner, no mint function,
          no pause and no blocklist — nobody, including you, can create more, freeze a balance or
          take tokens back.
        </p>

        {stage === "idle" || stage === "failed" ? (
          <Button onClick={handleForge} disabled={problems.length > 0 && Object.keys(touched).length > 0}>
            Deploy {draft.symbol.trim() || "token"}
          </Button>
        ) : null}

        <TxStatus stage={stage} hash={hash} failedLabel="Deployment failed — no token was created." />
      </div>
    </Panel>
  );
}
