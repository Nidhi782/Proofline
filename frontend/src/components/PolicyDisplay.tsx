import React from 'react';
import { DomainPolicy, PolicyPredicate } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { FileCode, Sliders, CheckSquare, Layers, ShieldCheck } from 'lucide-react';

interface PolicyDisplayProps {
  policy: DomainPolicy;
}

export const PolicyDisplay: React.FC<PolicyDisplayProps> = ({ policy }) => {
  const getPredicateBadgeColor = (type: PolicyPredicate['type']) => {
    switch (type) {
      case 'comparison':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'membership':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'range':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'equality':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getPredicateIcon = (type: PolicyPredicate['type']) => {
    switch (type) {
      case 'comparison':
        return <Sliders className="w-3.5 h-3.5" />;
      case 'membership':
        return <Layers className="w-3.5 h-3.5" />;
      case 'equality':
        return <CheckSquare className="w-3.5 h-3.5" />;
      default:
        return <FileCode className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              {policy.name}
            </h4>
            <p className="text-xs text-slate-400 mt-1">{policy.description}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Circuit:</span>
            <Badge variant="outline" className="font-mono text-[11px] text-indigo-300 border-indigo-500/40">
              {policy.circuit}.circom
            </Badge>
          </div>
        </div>

        {policy.requiredFields.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-500 text-[11px] font-mono uppercase">Required In Credential:</span>
            {policy.requiredFields.map((field) => (
              <span
                key={field}
                className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[11px] font-mono border border-slate-700/60"
              >
                {field}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Predicates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {policy.predicates.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 flex flex-col justify-between space-y-2 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-slate-200">
                {item.predicate}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPredicateBadgeColor(
                  item.type
                )}`}
              >
                {getPredicateIcon(item.type)}
                {item.type}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-snug">{item.description}</p>

            <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 text-[11px]">Threshold / Requirement:</span>
              <span className="text-indigo-300 font-bold bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/60">
                {item.threshold !== undefined ? String(item.threshold) : (item.allowedValues?.join(', ') || 'N/A')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
