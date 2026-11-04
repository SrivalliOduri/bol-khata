import { Mic } from 'lucide-react';

export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-navy-800 text-forest-400 ${className}`}
      style={{ width: size, height: size }}
    >
      <Mic size={size * 0.55} strokeWidth={2.4} />
    </div>
  );
}

export function LogoWithText({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <div className="leading-tight">
        <div className="font-extrabold text-navy-900 text-lg tracking-tight">Bol Khata</div>
        <div className="text-[10px] font-semibold text-forest-600 uppercase tracking-widest">Voice Ledger</div>
      </div>
    </div>
  );
}
