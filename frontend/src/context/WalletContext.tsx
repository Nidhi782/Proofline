import React, { createContext, useContext, useEffect } from 'react';
import { useWalletStore } from '../store/walletStore';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  updateBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWalletStore();

  // Try auto-reconnecting if ethereum account was previously active
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.selectedAddress) {
      wallet.connect().catch(() => {
        // Silent fail on auto-reconnect
      });
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address: wallet.address,
        isConnected: wallet.isConnected,
        chainId: wallet.chainId,
        balance: wallet.balance,
        isConnecting: wallet.isConnecting,
        error: wallet.error,
        connect: wallet.connect,
        disconnect: wallet.disconnect,
        updateBalance: wallet.updateBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    return useWalletStore();
  }
  return context;
}
