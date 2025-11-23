import { ethers } from 'ethers';
import { StorageService } from './storage';

/**
 * DeFi Interactor Module ABI - only the functions we need
 */
const DEFI_INTERACTOR_ABI = [
  'function transferToken(address token, address recipient, uint256 amount) external returns (bool success)',
  'function approveProtocol(address token, address target, uint256 amount) external',
  'function executeOnProtocol(address target, bytes calldata data) external returns (bytes memory result)'
];

/**
 * ERC20 transfer function selector
 */
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb'; // transfer(address,uint256)

/**
 * Detect if a transaction is an ERC20 transfer
 */
export function isERC20Transfer(transaction: ethers.TransactionRequest): boolean {
  if (!transaction.data || typeof transaction.data !== 'string') {
    return false;
  }

  const data = transaction.data.toLowerCase();

  // Check if it's a transfer function call (first 4 bytes = function selector)
  if (data.startsWith(ERC20_TRANSFER_SELECTOR)) {
    return true;
  }

  return false;
}

/**
 * Decode ERC20 transfer data
 */
export function decodeERC20Transfer(data: string): { recipient: string; amount: bigint } | null {
  try {
    // Remove '0x' prefix and function selector (first 4 bytes = 8 hex chars)
    const params = data.slice(10);

    // Decode recipient (32 bytes = 64 hex chars, but address is last 20 bytes = 40 hex chars)
    const recipientHex = params.slice(24, 64);
    const recipient = '0x' + recipientHex;

    // Decode amount (next 32 bytes = 64 hex chars)
    const amountHex = params.slice(64, 128);
    const amount = BigInt('0x' + amountHex);

    return { recipient, amount };
  } catch (error) {
    console.error('Failed to decode ERC20 transfer:', error);
    return null;
  }
}

/**
 * Wrap an ERC20 transfer transaction to go through DeFiInteractorModule
 */
export async function wrapTransferThroughModule(
  transaction: ethers.TransactionRequest,
  chainId: number
): Promise<ethers.TransactionRequest> {
  // Get DeFi Interactor Module config for this chain
  const config = await StorageService.getDeFiInteractorConfigForChain(chainId);

  if (!config || !config.enabled) {
    // Module not configured or not enabled for this chain, return original transaction
    console.log('[DeFi Interactor] Module not configured for chain', chainId);
    return transaction;
  }

  // Check if this is an ERC20 transfer
  if (!isERC20Transfer(transaction)) {
    console.log('[DeFi Interactor] Not an ERC20 transfer, skipping');
    return transaction;
  }

  // Decode the original transfer data
  const transferData = decodeERC20Transfer(transaction.data as string);
  if (!transferData) {
    console.error('[DeFi Interactor] Failed to decode transfer data');
    return transaction;
  }

  console.log('[DeFi Interactor] Wrapping transfer through module:', {
    token: transaction.to,
    recipient: transferData.recipient,
    amount: transferData.amount.toString(),
    moduleAddress: config.moduleAddress
  });

  // Create the DeFi Interactor Module interface
  const moduleInterface = new ethers.Interface(DEFI_INTERACTOR_ABI);

  // Encode the call to transferToken(token, recipient, amount)
  const wrappedData = moduleInterface.encodeFunctionData('transferToken', [
    transaction.to, // token address
    transferData.recipient,
    transferData.amount
  ]);

  // Return modified transaction that calls the module instead of the token directly
  return {
    ...transaction,
    to: config.moduleAddress, // Change target to the module
    data: wrappedData, // Replace data with module call
    value: 0 // No ETH value for token transfers
  };
}

/**
 * Get the DeFi Interactor Module contract instance
 */
export function getDeFiInteractorContract(
  moduleAddress: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(moduleAddress, DEFI_INTERACTOR_ABI, signerOrProvider);
}
