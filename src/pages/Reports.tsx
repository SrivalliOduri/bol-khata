import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, ReceiptText, Users, Volume2, Loader2, Calendar,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { fetchDashboardStats, fetchWeeklyData, fetchCustomers, fetchTransactions } from '@/lib/data';
import { formatRupees, paiseToRupees, formatDate } from '@/utils/format';
import { synthesizeSpeech, playAudioBase64 } from '@/lib/gnani';
import { toast } from '@/components/Toast';
import type { DashboardStats, WeeklyPoint, CustomerWithStats, TransactionWithCustomer, SupportedLanguage } from '@/types';

interface ReportsProps {
  preferredLanguage: SupportedLanguage;
}

export function Reports({ preferredLanguage }: ReportsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [recent, setRecent] = useState<TransactionWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const load = async () => {
    const [s, w, c, r] = await Promise.all([
      fetchDashboardStats(), fetchWeeklyData(), fetchCustomers(), fetchTransactions(),
    ]);
    setStats(s); setWeekly(w); setCustomers(c); setRecent(r.slice(0, 10));
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const pendingCustomers = customers.filter(c => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);

  const summaryText = stats ? `Today, you gave ${paiseToRupees(stats.today_credit)} rupees credit and received ${paiseToRupees(stats.today_payments)} rupees in payments. Your total outstanding balance is ${paiseToRupees(stats.total_outstanding)} rupees.` : '';

  const speakSummary = async () => {
    setSpeaking(true);
    try {
      const tts = await synthesizeSpeech(summaryText, preferredLanguage);
      playAudioBase64(tts.audioBase64);
    } catch {
      toast('error', 'Could not play the summary.');
    } finally {
      setSpeaking(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-navy-400" /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-navy-900">Reports</h2>
        <p className="text-sm text-navy-500 mt-0.5">Daily summary and weekly trends</p>
      </div>

      {/* Daily summary card */}
      <div className="card p-5 bg-gradient-to-br from-navy-800 to-navy-900 text-white">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-navy-300 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar size={13} /> Daily Summary
            </p>
            <p className="mt-2 text-base sm:text-lg leading-relaxed text-white/95 max-w-2xl">{summaryText}</p>
          </div>
          <button onClick={speakSummary} disabled={speaking} className="btn bg-white/10 text-white hover:bg-white/20 px-4 py-2.5 text-sm shrink-0">
            {speaking ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
            Listen
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Credit Today" value={formatRupees(stats?.today_credit ?? 0)} description="Given to customers today" tone="outstanding" icon={TrendingUp} />
        <StatCard label="Payments Today" value={formatRupees(stats?.today_payments ?? 0)} description="Collected today" tone="success" icon={TrendingDown} />
        <StatCard label="Net Outstanding" value={formatRupees(stats?.total_outstanding ?? 0)} description="Total pending" tone="primary" icon={Wallet} />
        <StatCard label="Today's Count" value={String(stats?.today_transactions ?? 0)} description="Transactions today" tone="today" icon={ReceiptText} />
      </div>

      {/* Weekly trend chart */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-bold text-navy-900 mb-4">Weekly Transaction Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="credGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#23804a" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#23804a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebe4d8" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5e7fa8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#5e7fa8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #dbe4f0', fontSize: 13 }}
                formatter={(v: any) => `₹${new Intl.NumberFormat('en-IN').format(Number(v))}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="credit" name="Credit Given" stroke="#dc2626" strokeWidth={2} fill="url(#credGrad)" />
              <Area type="monotone" dataKey="payment" name="Payments Received" stroke="#23804a" strokeWidth={2} fill="url(#payGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending balances */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy-900">Customers with Pending Balances</h3>
          <span className="text-sm text-navy-400">{pendingCustomers.length} customers</span>
        </div>
        {pendingCustomers.length === 0 ? (
          <p className="text-sm text-navy-400 text-center py-6">All balances settled!</p>
        ) : (
          <div className="divide-y divide-navy-100">
            {pendingCustomers.map(c => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">{c.name}</p>
                    <p className="text-xs text-navy-400">Last: {c.last_transaction_date ? formatDate(c.last_transaction_date) : 'N/A'}</p>
                  </div>
                </div>
                <p className="font-bold text-red-600 text-sm">{formatRupees(c.outstanding)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-bold text-navy-900 mb-3">Recent 10 Transactions</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-navy-400 text-center py-6">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-navy-100">
            {recent.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`badge ${t.transaction_type === 'CREDIT_GIVEN' ? 'bg-red-50 text-red-700' : 'bg-forest-50 text-forest-700'}`}>
                    {t.transaction_type === 'CREDIT_GIVEN' ? 'Credit' : 'Payment'}
                  </span>
                  <p className="font-semibold text-navy-900 text-sm truncate">{t.customer_name}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-navy-400 hidden sm:block">{formatDate(t.created_at)}</span>
                  <p className={`font-bold text-sm ${t.transaction_type === 'CREDIT_GIVEN' ? 'text-red-600' : 'text-forest-600'}`}>
                    {t.transaction_type === 'CREDIT_GIVEN' ? '+' : '-'}₹{new Intl.NumberFormat('en-IN').format(paiseToRupees(t.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
