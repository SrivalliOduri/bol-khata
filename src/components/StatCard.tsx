import { TrendingUp, TrendingDown, Users, Wallet, ArrowRightCircle, IndianRupee } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StatTone = 'outstanding' | 'success' | 'primary' | 'today';

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  tone: StatTone;
  icon: LucideIcon;
}

const toneConfig: Record<StatTone, { bg: string; iconBg: string; iconText: string; valueText: string }> = {
  outstanding: { bg: 'bg-white', iconBg: 'bg-red-50', iconText: 'text-red-600', valueText: 'text-navy-900' },
  success: { bg: 'bg-white', iconBg: 'bg-forest-50', iconText: 'text-forest-600', valueText: 'text-navy-900' },
  primary: { bg: 'bg-white', iconBg: 'bg-navy-50', iconText: 'text-navy-700', valueText: 'text-navy-900' },
  today: { bg: 'bg-white', iconBg: 'bg-sand-100', iconText: 'text-sand-700', valueText: 'text-navy-900' },
};

export function StatCard({ label, value, description, tone, icon: Icon }: StatCardProps) {
  const c = toneConfig[tone];
  return (
    <div className={`card card-hover p-5 ${c.bg}`}>
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 ${c.iconBg}`}>
          <Icon className={c.iconText} size={20} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-extrabold mt-1 ${c.valueText}`}>{value}</p>
        <p className="text-xs text-navy-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

export const statIcons = { TrendingUp, TrendingDown, Users, Wallet, ArrowRightCircle, IndianRupee };
