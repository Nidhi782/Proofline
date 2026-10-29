import React, { useState } from 'react';
import { Credential } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { shortAddress, formatDate, copyToClipboard } from '../lib/utils';
import { useToast } from './ui/Toast';
import {
  Shield,
  ExternalLink,
  Calendar,
  KeyRound,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';

interface CredentialCardProps {
  credential: Credential;
  onGenerateProof?: (credential: Credential) => void;
  onRevoke?: (credHash: string) => void;
  canRevoke?: boolean;
}

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onGenerateProof,
  onRevoke,
  canRevoke = false,
}) => {
  const [showAttributes, setShowAttributes] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const { toast } = useToast();

  const handleCopyHash = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(credential.credHash);
    if (ok) {
      setCopiedHash(true);
      toast({
        title: 'Copied',
        description: 'Credential commitment hash copied to clipboard.',
        type: 'success',
      });
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'academic':
        return 'default';
      case 'orgmembership':
        return 'success';
      case 'trustscore':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="flex flex-col justify-between overflow-hidden border-slate-800 hover:border-indigo-500/40 transition-all duration-300 group">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {credential.type}
                </CardTitle>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-slate-400">
                    {shortAddress(credential.credHash)}
                  </span>
                  <button
                    onClick={handleCopyHash}
                    className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                    title="Copy Credential Hash"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={getBadgeVariant(credential.type)}>
                {credential.type}
              </Badge>
              {credential.revoked ? (
                <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                  Revoked
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px] uppercase font-mono">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-3 text-xs">
          {/* Issuer / Subject DIDs */}
          <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase">Issuer:</span>
              <span className="text-slate-300" title={credential.issuerDID}>
                {credential.issuerDID.length > 22
                  ? `${credential.issuerDID.slice(0, 12)}...${credential.issuerDID.slice(-6)}`
                  : credential.issuerDID}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase">Subject:</span>
              <span className="text-slate-300" title={credential.subjectDID}>
                {credential.subjectDID.length > 22
                  ? `${credential.subjectDID.slice(0, 12)}...${credential.subjectDID.slice(-6)}`
                  : credential.subjectDID}
              </span>
            </div>
          </div>

          {/* Issue & Expiry Dates */}
          <div className="flex items-center justify-between text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Issued: {formatDate(credential.issuedAt).split(',')[0]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Expires: {formatDate(credential.expiryDate).split(',')[0]}</span>
            </div>
          </div>

          {/* Attributes Dropdown */}
          <div className="pt-1">
            <button
              onClick={() => setShowAttributes(!showAttributes)}
              className="w-full flex items-center justify-between py-1.5 px-2 rounded-md bg-slate-900/90 hover:bg-slate-850 text-slate-300 text-xs font-medium transition-colors"
            >
              <span>Credential Claims ({Object.keys(credential.attributes || {}).length})</span>
              {showAttributes ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {showAttributes && (
              <div className="mt-2 p-2.5 bg-slate-950/90 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1.5 animate-in fade-in-50">
                {Object.entries(credential.attributes || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-slate-900 pb-1 last:border-0 last:pb-0">
                    <span className="text-indigo-400 capitalize">{key}:</span>
                    <span className="text-slate-300 font-semibold truncate max-w-[200px]" title={String(val)}>
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </div>

      <CardFooter className="pt-3 pb-4 flex items-center justify-between gap-2">
        {credential.ipfsCID ? (
          <a
            href={`https://ipfs.io/ipfs/${credential.ipfsCID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            IPFS Attestation
          </a>
        ) : (
          <span className="text-[11px] text-slate-500">On-Chain Registry</span>
        )}

        <div className="flex items-center gap-2">
          {canRevoke && !credential.revoked && onRevoke && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRevoke(credential.credHash)}
              className="text-xs h-8"
            >
              Revoke
            </Button>
          )}

          {onGenerateProof && !credential.revoked && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onGenerateProof(credential)}
              className="text-xs h-8 gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-indigo-200" />
              Generate Proof
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
