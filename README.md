# Forge

Deploy a fixed-supply ERC-20 on BOT Chain in one click. No Solidity, no compiler, no owner.

**The one transaction:** `forge(string name, string symbol, uint8 decimals, uint256 supply)`

### Bohr testnet (968) — live

| | |
|---|---|
| Contract | [`0x64abe50A02A688e0e67662d13eF3740330E8cE01`](https://scan.bohr.life/address/0x64abe50A02A688e0e67662d13eF3740330E8cE01) · source verified |
| Deploy block | 27061684 |

### BOT Chain mainnet (677) — live

| | |
|---|---|
| Contract | [`0x64abe50A02A688e0e67662d13eF3740330E8cE01`](https://scan.botchain.ai/address/0x64abe50A02A688e0e67662d13eF3740330E8cE01) · source verified |
| Deploy block | 27267090 |

The site targets mainnet. The Bohr deployment above stays up and stays documented, so the
contract can still be exercised somewhere mistakes are free.

---

## What a forged token is, and is not

The entire supply is minted to you at deployment and fixed forever. The token has **no owner, no
mint function, no pause, no blocklist and no upgrade path** — nobody, including you, can create
more, freeze a balance or take tokens back.

That is the product, and it is the honest version of “deploy a token in one click”. If you need a
mintable or pausable token, this is the wrong tool and the app says so before you pay for it.

The token is written out rather than inherited from a library: the deployed bytecode is what you
pay for on a chain with no faucet, and anyone judging it should be able to read the whole thing in
one sitting.

**Measured:** `forge()` costs 416,584 gas. 27 tests, 13 of them on the ERC-20 mechanics alone.

## Development

```bash
npm install
npm run chain:check          # both BOT Chain networks: ID, head age, gas price
npm test                     # unit tests and the render-loop lint rule
npm run test:integration     # the ABI against the real contract on anvil, where present
npm run dev

cd contracts && forge test -vv
```

## Deploying

Put `DEPLOYER_PRIVATE_KEY` in `.env` (gitignored, `0x` prefix optional), then:

```bash
cd contracts
./deploy.sh bohr --dry     # simulate, broadcast nothing
./deploy.sh bohr           # testnet
./deploy.sh botchain       # mainnet — real BOT, no faucet
```

The wrapper asks the node what chain it is on and refuses to broadcast if it disagrees with the
network named — the one mistake here that cannot be undone. It then verifies the source on the
explorer, reading the contract's name from the broadcast log rather than guessing it from a
filename.

## Built from the template

`../template`, extracted from `ST-Frontier/ghost-pay`. See `../TEMPLATE.md`.
