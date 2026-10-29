import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle,
  Copy,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { copyToClipboard } from '../lib/utils';
import { useToast } from './ui/Toast';
import { ZKProof } from '../types';

export type ProofState = 'idle' | 'generating' | 'verifying' | 'permitted' | 'denied';

interface ProofStatusProps {
  status: ProofState;
  proof?: ZKProof | null;
  publicSignals?: string[];
  executionTimeMs?: number;
  circuitName?: string;
  auditRef?: string;
  reason?: string;
}

export const ProofStatus: React.FC<ProofStatusProps> = ({
  status,
  proof,
  publicSignals = [],
  executionTimeMs,
  circuitName,
  auditRef,
  reason,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const handleCopyProof = async () => {
    if (!proof) return;
    const ok = await copyToClipboard(JSON.stringify(proof, null, 2));
    if (ok) {
      toast({
        title: 'Proof Copied',
        description: 'Groth16 proof calldata copied to clipboard.',
        type: 'success',
      });
    }
  };

  if (status === 'idle') {
    return (
      <Card className="border-dashed border-slate-800 bg-slate-900/30">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-slate-500">
            <Cpu className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-300">ZKP Verification Engine Ready</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Provide a zero-knowledge proof along with public inputs to trigger cryptographic policy verification.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border transition-all duration-300 ${
        status === 'permitted'
          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
          : status === 'denied'
          ? 'border-red-500/40 bg-red-950/20 shadow-lg shadow-red-950/20'
          : 'border-indigo-500/40 bg-slate-900/80'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Status Icon */}
            <div className="relative">
              {status === 'generating' && (
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                </div>
              )}
              {status === 'verifying' && (
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
                </div>
              )}
              {status === 'permitted' && (
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-in zoom-in-95">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
              )}
              {status === 'denied' && (
                <div className="h-14 w-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shadow-lg shadow-red-500/20 animate-in zoom-in-95">
                  <ShieldX className="w-8 h-8 text-red-400" />
                </div>
              )}
            </div>

            {/* Status Information */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {status === 'generating' && 'Generating Zero-Knowledge Proof...'}
                  {status === 'verifying' && 'Verifying Proof against Policy Engine...'}
                  {status === 'permitted' && 'ACCESS PERMITTED (PERMIT)'}
                  {status === 'denied' && 'ACCESS DENIED (DENY)'}
                </span>
                <Badge
                  variant={
                    status === 'permitted'
                      ? 'success'
                      : status === 'denied'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {status.toUpperCase()}
                </Badge>
              </div>

              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {status === 'generating' && 'Computing witness and synthesizing Groth16 cryptographic proof...'}
                {status === 'verifying' && 'Validating pairing curve constraints and public nullifiers on PDP contract...'}
                {status === 'permitted' && (reason || 'All zero-knowledge predicate constraints and nullifier checks successfully satisfied.')}
                {status === 'denied' && (reason || 'Cryptographic verification failed or predicate threshold requirements not satisfied.')}
              </p>

              {auditRef && (
                <div className="mt-2 flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Audit Identifier: <strong className="text-white">{auditRef}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Meta metrics & Toggle */}
          <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
            {executionTimeMs !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{executionTimeMs} ms</span>
              </div>
            )}
            {circuitName && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {circuitName}
              </Badge>
            )}

            {(proof || publicSignals.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-slate-300 hover:text-white gap-1 mt-1"
              >
                {expanded ? 'Hide Details' : 'View Proof Signals'}
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Technical Proof Details */}
        {expanded && (proof || publicSignals.length > 0) && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3 animate-in fade-in-50">
            {publicSignals.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono block mb-1.5">
                  Public Signals ({publicSignals.length})
                </span>
                <div className="bg-slate-950/90 rounded-lg p-3 font-mono text-xs text-slate-300 border border-slate-800/80 overflow-x-auto space-y-1">
                  {publicSignals.map((signal, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-500 select-none">[{idx}]</span>
                      <span className="text-indigo-300 break-all">{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {proof && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    Groth16 Curve Points ({proof.curve} / {proof.protocol})
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyProof}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Proof JSON
                  </Button>
                </div>
                <pre className="bg-slate-950/90 rounded-lg p-3 font-mono text-[11px] text-slate-400 border border-slate-800/80 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(proof, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
