import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWalletStore } from '../store/walletStore';
import { shortAddress } from '../lib/wallet';
import { Button } from './ui/Button';
import {
  ShieldCheck,
  Wallet,
  Building2,
  FileCheck2,
  Vote,
  Power,
  ChevronDown,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { address, isConnected, isConnecting, balance, connect, disconnect } = useWalletStore();
  const location = useLocation();

  const navLinks = [
    { name: 'Issuer', path: '/issuer', icon: Building2 },
    { name: 'Holder Wallet', path: '/holder', icon: Wallet },
    { name: 'Verifier', path: '/verifier', icon: FileCheck2 },
    { name: 'Governance', path: '/governance', icon: Vote },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <NavLink to="/holder" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center transition-transform group-hover:scale-105">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Proofline <span className="text-indigo-400 font-mono text-xs px-1.5 py-0.5 bg-indigo-950/80 rounded border border-indigo-800/50">v1.0</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Private Identity Verification
                </span>
              </div>
            </NavLink>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Wallet & Status Controls */}
          <div className="flex items-center gap-3">
            {/* Blockchain Network Status Dot */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300"
              title={isConnected ? 'Connected to EVM Chain (31337 / Mainnet)' : 'Wallet Disconnected'}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </span>
              <span className="font-mono text-[11px] hidden sm:inline">
                {isConnected ? 'EVM Active' : 'Offline'}
              </span>
            </div>

            {/* Wallet Action Button */}
            {isConnected && address ? (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-1 pl-3 shadow-sm">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200 font-mono">
                    {shortAddress(address)}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {balance} ETH
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                  title="Disconnect Wallet"
                >
                  <Power className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => connect()}
                isLoading={isConnecting}
                className="gap-2 font-medium"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Nav Row */}
        <div className="flex md:hidden border-t border-slate-800/60 py-2 space-x-1 overflow-x-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </div>
    </header>
  );
};
