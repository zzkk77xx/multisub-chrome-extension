# MultiSub Extension

> A Chrome extension wallet that enables **permission-restricted DeFi interactions** by disguising as a Safe multisig and relaying transactions through the DeFiInteractorModule.

Part of the MultiSub ecosystem.

## Overview

MultiSub solves a critical UX problem: **How to use a hot wallet with DApps while maintaining Safe multisig security controls**.

**The Innovation**:

- DApps think they're interacting with a Safe multisig (via EIP-1271 signature verification)
- Transactions are actually relayed through the **DeFiInteractorModule** (custom Zodiac module)
- The module enforces role-based permissions, allowlists, and time-windowed limits
- Your Safe multisig retains full control and can revoke permissions instantly

### Why We Built This From Scratch

**We had no other choice** than building our own wallet extension due to fundamental architectural constraints:

1. **Existing wallets can't masquerade as Safe**:

   - MetaMask, Rainbow, etc. inject the EOA address into `window.ethereum`
   - We need DApps to see the **Safe address**, not the EOA
   - No extension wallet supports this mode of operation

2. **Transaction routing is hardcoded**:

   - Standard wallets send transactions directly to the target (e.g., Aave)
   - We need to **intercept and reroute** through DeFiInteractorModule
   - The module address is the actual `tx.to`, with the original target embedded in calldata

3. **EIP-1193 provider must lie (intentionally)**:

   - `eth_accounts` must return `[safeAddress]` instead of `[eoaAddress]`
   - `eth_sendTransaction` must rewrite the transaction before signing
   - Standard wallet APIs don't allow this level of control

4. **No existing solution for delegated Safe operations**:
   - Safe's built-in delegation requires multisig confirmation
   - We need **single-signature execution** via the module
   - The module handles Safe.exec() internally

**Result**: A custom Chrome extension that speaks standard EIP-1193 to DApps but implements non-standard routing logic internally.

## Architecture

```
┌─────────────────────────────────────────┐
│     DApp (Uniswap, Aave, etc.)          │
│                                         │
│  Sees: Safe multisig address            │
│  Gets: EIP-1271 signature verification  │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│    MultiSub Extension (This Wallet)     │
│                                         │
│  • Masquerades as Safe                  │
│  • Provides EIP-1193 provider           │
│  • Routes txs → DeFiInteractorModule    │
│  • Hot wallet UX, cold storage security │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│     DeFiInteractorModule (Zodiac)       │
│                                         │
│  • Validates sub-account permissions    │
│  • Checks protocol allowlist            │
│  • Enforces time-windowed limits        │
│  • Executes via Safe.exec()             │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│          Safe Multisig                  │
│                                         │
│  • Actual custody of funds              │
│  • Configures module permissions        │
│  • Emergency controls                   │
└─────────────────────────────────────────┘
```

## Core Functionalities

### 1. Safe Multisig Impersonation

The extension presents the **Safe address** to DApps instead of the EOA address:

- `window.ethereum.request({ method: 'eth_accounts' })` returns `[safeAddress]`
- DApps interact with the Safe address as if it were a standard EOA
- All signature requests are handled via **EIP-1271** contract signature verification
- The Safe appears as a standard wallet to DApps

**Why this matters**: DApps only see and interact with your Safe. Your hot wallet (EOA) remains invisible.

### 2. Transaction Relay Through DeFiInteractorModule

Every transaction is routed through the custom Zodiac module:

```typescript
// Instead of: Safe.executeTransaction(target, value, data)
// Extension calls: DeFiInteractorModule.executeOnProtocol(target, data)
```

The module enforces:

- **Role verification**: Does this sub-account have DEFI_EXECUTE_ROLE?
- **Allowlist check**: Is the target protocol allowed for this sub-account?
- **Limit validation**: Does this stay within time-windowed deposit/withdraw limits?
- **Safe execution**: Passes through to Safe.exec() only if all checks pass

**Why this matters**: You get hot wallet convenience with multisig-level security controls.

### 3. Permission-Restricted Operations

The extension exposes three core operations mapped to module functions:

| Operation         | Module Function       | Required Role      | Enforced Limits                              |
| ----------------- | --------------------- | ------------------ | -------------------------------------------- |
| Approve tokens    | `approveProtocol()`   | DEFI_EXECUTE_ROLE  | Protocol allowlist                           |
| DeFi interactions | `executeOnProtocol()` | DEFI_EXECUTE_ROLE  | Protocol allowlist + deposit/withdraw limits |
| Token transfers   | `transferToken()`     | DEFI_TRANSFER_ROLE | Transfer limits + time windows               |

**Why this matters**: The Safe owners (cold wallet) grant granular permissions. Sub-accounts can only do what they're explicitly allowed to do.

## Installation

### Prerequisites

1. **Deploy MultiSub infrastructure**:

   - Deploy a Safe multisig
   - Deploy DeFiInteractorModule and enable it on the Safe
   - See [MultiSub documentation](https://github.com/plouis01/multisub)

2. **Configure sub-account**:

   ```bash
   # Grant DEFI_EXECUTE_ROLE (1) to your hot wallet
   cast send $MODULE "grantRole(address,uint16)" $EOA_ADDRESS 1

   # Set allowed protocols (e.g., Aave, Morpho, Uniswap)
   cast send $MODULE "setAllowedAddresses(address,address[],bool)" \
     $EOA_ADDRESS "[$AAVE_POOL,$MORPHO_VAULT]" true

   # Set limits (e.g., 10% deposit, 5% withdraw, 48h window)
   cast send $MODULE "setSubAccountLimits(address,uint256,uint256,uint256,uint256)" \
     $EOA_ADDRESS 1000 500 300 172800
   ```

### Build Extension

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Or run in dev mode with hot reload
npm run dev
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

## Project Structure

```
multisub-extension/
├── src/
│   ├── core/
│   │   ├── wallet.ts          # BIP39/BIP44 wallet (EOA generation)
│   │   └── crypto.ts          # AES-GCM encryption
│   ├── services/
│   │   ├── storage.ts         # Chrome storage
│   │   └── defi-module.ts     # DeFiInteractorModule interface
│   ├── background/
│   │   └── background.ts      # Routes txs to module
│   ├── content/
│   │   ├── content.ts         # Bridge to inject.ts
│   │   └── inject.ts          # EIP-1193 provider (masquerades as Safe)
│   └── popup/
│       ├── popup.html         # Wallet UI
│       └── popup.ts           # Configure Safe/Module addresses
├── public/
│   └── manifest.json          # Chrome Manifest V3
└── test-dapp.html             # Local DApp for testing
```

## Configuration

### First Time Setup

1. **Create or import EOA**:

   - Click extension icon
   - Create new wallet or import existing mnemonic
   - This becomes your sub-account (hot wallet)

2. **Configure Safe connection**:

   - Enter your Safe multisig address
   - Enter deployed DeFiInteractorModule address
   - Verify your EOA has been granted roles by the Safe

3. **Test with DApp**:
   - Open any DApp (Uniswap, Aave, etc.)
   - Connect wallet - DApp sees your Safe address
   - Sign transactions - routed through module

### Usage

The extension handles three transaction types:

1. **Token Approvals**:

   - DApp: "Approve USDC for Aave"
   - Extension: `approveProtocol(USDC, AAVE_POOL, amount)`
   - Module: Checks allowlist, executes via Safe

2. **DeFi Operations**:

   - DApp: "Deposit 1000 USDC to Aave"
   - Extension: `executeOnProtocol(AAVE_POOL, deposit_calldata)`
   - Module: Checks role + allowlist + limits, executes via Safe

3. **Token Transfers**:
   - DApp: "Send 100 USDC to 0x..."
   - Extension: `transferToken(USDC, recipient, amount)`
   - Module: Checks DEFI_TRANSFER_ROLE + limits, executes via Safe

### Supported DApps

Any EIP-1193 compatible DApp:

- Uniswap (swaps, liquidity)
- Aave (lending/borrowing)
- Morpho (optimized yields)
- Compound, Curve, Balancer, etc.

**Note**: Only protocols added to the module's allowlist will work.

## How It Works Under the Hood

### 1. Provider Injection (`inject.ts`)

```typescript
// DApps see the Safe address, not the EOA
window.ethereum.request({ method: "eth_accounts" });
// Returns: ['0xSafeAddress...'] (not '0xEOAAddress...')

// When DApp requests a transaction:
window.ethereum.request({
  method: "eth_sendTransaction",
  params: [
    {
      from: safeAddress,
      to: aavePool,
      data: depositCalldata,
    },
  ],
});
```

### 2. Transaction Routing (`background.ts`)

```typescript
// Extension intercepts and routes to module:
const moduleCalldata = encodeFunctionData({
  abi: DeFiInteractorModule.abi,
  functionName: "executeOnProtocol",
  args: [aavePool, depositCalldata],
});

// EOA signs transaction to module (not to Aave directly)
const tx = {
  from: eoaAddress,
  to: moduleAddress,
  data: moduleCalldata,
};
```

### 3. Module Validation (On-chain)

```solidity
// DeFiInteractorModule.executeOnProtocol()
require(hasRole(msg.sender, DEFI_EXECUTE_ROLE), "No permission");
require(allowedAddresses[msg.sender][target], "Protocol not allowed");
require(checkLimits(msg.sender, amount), "Exceeds limits");

// Execute via Safe
ISafe(avatar).exec(target, 0, data, Enum.Operation.Call);
```

### 4. Safe Execution

```solidity
// Safe.exec() called by module
// Actual interaction with Aave happens here
// Funds never leave the Safe
```

## Security Model

### Trust Assumptions

| Component                | Trust Level         | Why                                           |
| ------------------------ | ------------------- | --------------------------------------------- |
| **Safe Multisig**        | Full trust          | You control the keys                          |
| **DeFiInteractorModule** | Code audit required | Controls your permissions                     |
| **MultiSub Extension**   | Minimal trust       | Only relays transactions, can't bypass module |
| **DApps**                | Zero trust          | Can only request, module enforces allowlist   |

### Attack Vectors & Mitigations

1. **Compromised EOA (hot wallet)**:

   - Attacker limited by role permissions
   - Can't approve/interact with non-allowlisted protocols
   - Can't exceed time-windowed limits
   - Safe owners can instantly revoke role

2. **Malicious DApp**:

   - Can only request transactions to allowlisted protocols
   - Module validates all calls on-chain
   - Can't drain Safe beyond limits

3. **Phishing/Social Engineering**:

   - User signs malicious approval
   - Still limited by protocol allowlist
   - Large transfers blocked by limits

4. **Module Exploit**:
   - Safe owners can disable module instantly
   - Emergency pause function available
   - Regular security audits recommended

## Development

### Testing Locally

```bash
# 1. Start local test DApp
open test-dapp.html

# 2. Build extension in dev mode
npm run dev

# 3. Load extension and test
# Should see Safe address in DApp
# Transactions should route through module
```

### Key Files

- `src/content/inject.ts:45` - Safe address masquerading
- `src/background/background.ts:120` - Module transaction routing
- `src/services/defi-module.ts` - Module ABI and interfaces

## Limitations

- Only supports EVM chains (Ethereum, Polygon, Arbitrum, etc.)
- Requires DeFiInteractorModule deployment
- Gas fees paid by EOA (not Safe)
- Single signature transactions (module handles Safe execution)

## Roadmap

- [ ] Hardware wallet support for EOA
- [ ] Transaction simulation before signing
- [ ] Multi-Safe management
- [ ] Mobile app (React Native)
- [ ] Gasless transactions (relayers)

## Resources

- [MultiSub Smart Contracts](https://github.com/plouis01/multisub)
- [Safe Documentation](https://docs.safe.global/)
- [Zodiac Modules](https://www.zodiac.wiki/)
- [EIP-1193 Spec](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-1271 Spec](https://eips.ethereum.org/EIPS/eip-1271)

## License

MIT

## Disclaimer

This wallet is part of the MultiSub research project. Smart contracts should be audited before production use. Never store more funds than you can afford to lose. This is experimental software.
