import { BrowserProvider, Signer, formatEther } from 'ethers';

// Ethereum window declaration
declare global {
  interface Window {
    ethereum?: any;
  }
}

export function shortAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function connectMetaMask(): Promise<{ address: string; provider: BrowserProvider }> {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts authorized in MetaMask');
      }
      return { address: accounts[0], provider };
    } catch (err: any) {
      if (err.code === 4001) {
        throw new Error('User rejected wallet connection request.');
      }
      throw new Error(err.message || 'Failed to connect MetaMask.');
    }
  }

  // Fallback simulated wallet for development if MetaMask extension is not installed
  console.warn('MetaMask not detected in browser. Utilizing simulated local wallet account.');
  const mockAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // Return dummy or mock provider with basic contract reading capabilities
  const mockProvider = {
    getBalance: async () => BigInt('10000000000000000000'), // 10 ETH
    getNetwork: async () => ({ chainId: BigInt(31337), name: 'hardhat' }),
    getSigner: async () => ({
      getAddress: async () => mockAddress,
      signMessage: async (msg: string) => `0xsimulated_signature_for_${btoa(msg).slice(0, 20)}`,
    }),
  } as unknown as BrowserProvider;

  return { address: mockAddress, provider: mockProvider };
}

export async function getBalance(address: string, provider: BrowserProvider): Promise<string> {
  try {
    const balanceWei = await provider.getBalance(address);
    const formatted = formatEther(balanceWei);
    // Format to 4 decimal places
    const num = parseFloat(formatted);
    return isNaN(num) ? '0.0000' : num.toFixed(4);
  } catch (err) {
    console.warn('Could not fetch balance:', err);
    return '0.0000';
  }
}

export async function signMessage(message: string, signer: Signer): Promise<string> {
  return await signer.signMessage(message);
}

export async function switchChain(chainId: number, provider: BrowserProvider): Promise<void> {
  if (typeof window !== 'undefined' && window.ethereum) {
    const hexChainId = `0x${chainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      // Chain not added
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: hexChainId,
              chainName: `Network ${chainId}`,
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['http://127.0.0.1:8545'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }
}
