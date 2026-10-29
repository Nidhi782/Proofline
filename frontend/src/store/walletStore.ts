import { create } from 'zustand';
import { BrowserProvider, Signer } from 'ethers';
import { connectMetaMask, getBalance } from '../lib/wallet';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string;
  provider: BrowserProvider | null;
  signer: Signer | null;
  isConnecting: boolean;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  updateBalance: () => Promise<void>;
  setAddress: (addr: string | null) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  chainId: null,
  balance: '0.0000',
  provider: null,
  signer: null,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });
    try {
      const { address, provider } = await connectMetaMask();
      const network = await provider.getNetwork();
      const balance = await getBalance(address, provider);
      const signer = await provider.getSigner().catch(() => null);

      set({
        address,
        isConnected: true,
        chainId: Number(network.chainId),
        balance,
        provider,
        signer,
        isConnecting: false,
      });

      // Listen for account/chain changes if in real browser window with ethereum
      if (typeof window !== 'undefined' && window.ethereum && window.ethereum.on) {
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (!accounts || accounts.length === 0) {
            get().disconnect();
          } else {
            set({ address: accounts[0] });
            get().updateBalance();
          }
        });

        window.ethereum.on('chainChanged', (chainHex: string) => {
          set({ chainId: parseInt(chainHex, 16) });
          get().updateBalance();
        });
      }
    } catch (err: any) {
      set({
        isConnecting: false,
        error: err.message || 'Failed to connect wallet',
        isConnected: false,
      });
      throw err;
    }
  },

  disconnect: () => {
    set({
      address: null,
      isConnected: false,
      chainId: null,
      balance: '0.0000',
      provider: null,
      signer: null,
      error: null,
    });
  },

  updateBalance: async () => {
    const { address, provider } = get();
    if (!address || !provider) return;
    try {
      const balance = await getBalance(address, provider);
      set({ balance });
    } catch (err) {
      console.warn('Balance refresh failed:', err);
    }
  },

  setAddress: (addr: string | null) => {
    set({ address: addr, isConnected: Boolean(addr) });
  },
}));
