import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Wallet, TrendingDown, Users, ReceiptText, Mic, Plus, ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { TypeBadge, SampleBadge, BalanceDisplay } from '@/components/Badges';
import { TransactionModal } from '@/components/TransactionModal';
import {
  fetchDashboardStats, fetchTransactions, fetchWeeklyData,
} from '@/lib/data';
import { formatRupees, paiseToRupees, formatDateTime, relativeTime } from '@/utils/format';
import type { DashboardStats, TransactionWithCustomer, WeeklyPoint, CustomerWithStats, TransactionType } from '@/types';

interface DashboardProps {
  customers: CustomerWithStats[];
  reload: () => Promise<void>;
}

export function Dashboard({ customers, reload }: DashboardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<TransactionWithCustomer[]>([]);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('CREDIT_GIVEN');

  const topOutstanding = useMemo(
    () => [...customers].filter(c => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5),
    [customers],
  );

  const loadAll = async () => {
    const [s, r, w] = await Promise.all([
      fetchDashboardStats(), fetchTransactions(), fetchWeeklyData(),
    ]);
    setStats(s); setRecent(r.slice(0, 6)); setWeekly(w);
    setLoading(false);
  };

  useEffect(() => { loadAll().catch(() => setLoading(false)); }, []);

  const openTxModal = (type: TransactionType) => {
    setTxType(type);
    setTxModalOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-navy-400">Loading dashboard…</p></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-navy-900">Welcome back</h2>
        <p className="text-sm text-navy-500 mt-0.5">Here's your business at a glance.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Outstanding Credit" value={formatRupees(stats?.total_outstanding ?? 0)} description="Total pending from customers" tone="outstanding" icon={Wallet} />
        <StatCard label="Payments Received" value={formatRupees(stats?.total_payments ?? 0)} description="Total collected all-time" tone="success" icon={TrendingDown} />
        <StatCard label="Total Customers" value={String(stats?.total_customers ?? 0)} description="In your ledger" tone="primary" icon={Users} />
        <StatCard label="Today's Transactions" value={String(stats?.today_transactions ?? 0)} description={`${formatRupees(stats?.today_credit ?? 0)} credit · ${formatRupees(stats?.today_payments ?? 0)} payments`} tone="today" icon={ReceiptText} />
      </div>

      {/* Quick actions */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-bold text-navy-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <button onClick={() => openTxModal('CREDIT_GIVEN')} className="btn px-3 py-3.5 text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-100">
            <Plus size={17} /> Add Credit
          </button>
          <button onClick={() => openTxModal('PAYMENT_RECEIVED')} className="btn px-3 py-3.5 text-sm bg-forest-50 text-forest-700 hover:bg-forest-100 border border-forest-100">
            <TrendingDown size={17} /> Record Payment
          </button>
          <button onClick={() => navigate('/customers?action=add')} className="btn px-3 py-3.5 text-sm bg-navy-50 text-navy-700 hover:bg-navy-100 border border-navy-100">
            <Users size={17} /> Add Customer
          </button>
          <button onClick={() => navigate('/voice')} className="btn px-3 py-3.5 text-sm bg-forest-600 text-white hover:bg-forest-700 shadow-sm">
            <Mic size={17} /> Voice Transaction
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Recent transactions */}
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-navy-900">Recent Transactions</h3>
            <button onClick={() => navigate('/transactions')} className="text-sm font-semibold text-navy-500 hover:text-navy-800 flex items-center gap-1">
              View all <ArrowRight size={15} />
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState text="No transactions yet. Start by recording a voice transaction." />
          ) : (
            <div className="divide-y divide-navy-100">
              {recent.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.transaction_type === 'CREDIT_GIVEN' ? 'bg-red-50 text-red-600' : 'bg-forest-50 text-forest-600'}`}>
                    {t.transaction_type === 'CREDIT_GIVEN' ? <Plus size={17} /> : <TrendingDown size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-navy-900 text-sm truncate">{t.customer_name}</p>
                      {t.is_sample && <SampleBadge />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TypeBadge type={t.transaction_type} />
                      <span className="text-xs text-navy-400">{relativeTime(t.created_at)}</span>
                    </div>
                  </div>
                  <p className={`font-bold text-sm shrink-0 ${t.transaction_type === 'CREDIT_GIVEN' ? 'text-red-600' : 'text-forest-600'}`}>
                    {t.transaction_type === 'CREDIT_GIVEN' ? '+' : '-'}₹{new Intl.NumberFormat('en-IN').format(paiseToRupees(t.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outstanding balances */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-navy-900">Top Outstanding</h3>
            <button onClick={() => navigate('/customers')} className="text-sm font-semibold text-navy-500 hover:text-navy-800 flex items-center gap-1">
              All <ArrowRight size={15} />
            </button>
          </div>
          {topOutstanding.length === 0 ? (
            <EmptyState text="No pending balances. All settled!" />
          ) : (
            <div className="space-y-3">
              {topOutstanding.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="w-full flex items-center justify-between gap-3 py-2 hover:bg-navy-50 -mx-2 px-2 rounded-lg transition text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-navy-900 text-sm truncate">{c.name}</p>
                      {c.is_sample && <SampleBadge />}
                    </div>
                    <p className="text-xs text-navy-400 mt-0.5">{c.transaction_count} transactions</p>
                  </div>
                  <BalanceDisplay paise={c.outstanding} className="text-sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly chart */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-bold text-navy-900 mb-4">Weekly Overview</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebe4d8" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5e7fa8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#5e7fa8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #dbe4f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                formatter={(v: any) => `₹${new Intl.NumberFormat('en-IN').format(Number(v))}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="credit" name="Credit Given" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payment" name="Payments Received" fill="#23804a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <TransactionModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        customers={customers}
        defaultType={txType}
        onSaved={() => { reload(); loadAll(); }}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-navy-400">{text}</p>
    </div>
  );
}
