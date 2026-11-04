import { TrendingUp, TrendingDown } from 'lucide-react';
import type { TransactionType } from '@/types';

export function TypeBadge({ type }: { type: TransactionType }) {
  if (type === 'CREDIT_GIVEN') {
    return (
      <span className="badge bg-red-50 text-red-700">
        <TrendingUp size={12} /> Credit
      </span>
    );
  }
  return (
    <span className="badge bg-forest-50 text-forest-700">
      <TrendingDown size={12} /> Payment
    </span>
  );
}

export function SampleBadge() {
  return <span className="badge bg-navy-100 text-navy-600">Sample</span>;
}

export function BalanceDisplay({ paise, className = '' }: { paise: number; className?: string }) {
  const positive = paise > 0;
  const zero = paise === 0;
  return (
    <span className={`font-semibold ${zero ? 'text-navy-400' : positive ? 'text-red-600' : 'text-forest-600'} ${className}`}>
      {zero ? '₹0' : `₹${new Intl.NumberFormat('en-IN').format(Math.abs(Math.round(paise / 100)))}`}
    </span>
  );
}
