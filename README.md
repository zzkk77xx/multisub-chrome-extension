<div align="center">
  <img src="public/icons/logo.png" alt="MultiSub Logo" width="200"/>
  <h1>MultiSub Extension</h1>
  <p><strong>Hot wallet UX with Safe multisig security</strong></p>
</div>

---

## What Is This?

A Chrome extension that lets DApps interact with your **Safe multisig** while you sign with a **hot wallet**. All transactions are permission-restricted by the [DeFiInteractorModule](https://github.com/plouis01/multisub).

**TL;DR**: DApps see your Safe address. You sign with your EOA. Transactions route through a Zodiac module that enforces allowlists and limits.

## Why Build This?

**We had no choice.** Existing wallets (MetaMask, Rainbow, etc.) can't:
- Inject a Safe address instead of an EOA into `window.ethereum`
- Reroute transactions through a Zodiac module before execution
- Provide single-signature Safe execution via delegated permissions

Standard wallet APIs don't allow the transaction rewriting we need.

## How It Works

```
DApp (Uniswap/Aave) → Extension (masquerades as Safe) → Module (validates) → Safe (executes)
```

**Key insight**: `window.ethereum.eth_accounts` returns your Safe address, not your EOA.

### Transaction Flow

1. **DApp requests**: `eth_sendTransaction({ to: Aave, data: deposit() })`
2. **Extension rewrites**: `{ to: Module, data: executeOnProtocol(Aave, deposit()) }`
3. **Module validates**: Check role, allowlist, and limits
4. **Safe executes**: `exec(Aave, deposit())`

### Operations

| Action | Module Function | Role | Limits |
|--------|----------------|------|---------|
| Approve | `approveProtocol()` | EXECUTE | Protocol allowlist |
| DeFi ops | `executeOnProtocol()` | EXECUTE | Allowlist + time-windowed limits |
| Transfers | `transferToken()` | TRANSFER | Amount + time windows |

## Quick Start

**Prerequisites**: Deploy [MultiSub infrastructure](https://github.com/plouis01/multisub) (Safe + Module)

```bash
npm install && npm run build
```

Load in Chrome: `chrome://extensions/` → Developer mode → Load unpacked → Select `dist/`

## Setup

1. Create/import EOA in extension
2. Enter Safe address + Module address
3. Grant role from Safe: `grantRole(eoaAddress, DEFI_EXECUTE_ROLE)`
4. Configure allowlist: `setAllowedAddresses(eoaAddress, [Aave, Morpho], true)`
5. Connect to any DApp (Uniswap, Aave, etc.) - they'll see your Safe address

**Works with**: Any EIP-1193 DApp (only allowlisted protocols execute successfully)

## Security

### What If...

**Hot wallet compromised?** → Limited by allowlist + time-windowed limits + Safe can revoke role
**Malicious DApp?** → Can only call allowlisted protocols, module validates on-chain
**Module exploit?** → Safe can disable module instantly via `disableModule()`

### Trust Model

| Component | Trust | Notes |
|-----------|-------|-------|
| Safe | Full | You control keys |
| Module | Audit required | Enforces all security |
| Extension | Minimal | Just relays, can't bypass module |
| DApps | Zero | Module validates everything |

## Development

```bash
npm run dev          # Hot reload
open test-dapp.html  # Test with local DApp
```

**Key files**:
- `src/content/inject.ts` - Safe masquerading
- `src/background/background.ts` - Transaction routing
- `src/services/defi-module.ts` - Module interface

## Resources

- [MultiSub Contracts](https://github.com/plouis01/multisub)
- [Safe Docs](https://docs.safe.global/)
- [Zodiac Modules](https://www.zodiac.wiki/)

---

**License**: MIT | **Status**: Research project (audit before production use)
