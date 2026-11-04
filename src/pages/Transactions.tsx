import { useEffect, useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Plus, Loader2 } from 'lucide-react';
import { fetchTransactions } from '@/lib/data';
import { TransactionModal } from '@/components/TransactionModal';
import { TypeBadge, SampleBadge } from '@/components/Badges';
import { formatDateTime, paiseToRupees } from '@/utils/format';
import type { TransactionWithCustomer, CustomerWithStats, TransactionType } from '@/types';

interface TransactionsProps {
  customers: CustomerWithStats[];
  reload: () => Promise<void>;
}

export function Transactions({ customers, reload }: TransactionsProps) {
  const [all, setAll] = useState<TransactionWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    const data = await fetchTransactions();
    setAll(data);
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const filtered = useMemo(() => {
    let list = all;
    if (typeFilter !== 'all') list = list.filter(t => t.transaction_type === typeFilter);
    if (customerFilter !== 'all') list = list.filter(t => t.customer_id === customerFilter);
    if (dateFilter) {
      const d = new Date(dateFilter);
      list = list.filter(t => {
        const td = new Date(t.created_at);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth() && td.getDate() === d.getDate();
      });
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(t =>
        t.customer_name.toLowerCase().includes(s) ||
        (t.original_transcript ?? '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [all, typeFilter, customerFilter, dateFilter, search]);

  const totalCredit = filtered.filter(t => t.transaction_type === 'CREDIT_GIVEN').reduce((s, t) => s + t.amount, 0);
  const totalPayment = filtered.filter(t => t.transaction_type === 'PAYMENT_RECEIVED').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Transactions</h2>
          <p className="text-sm text-navy-500 mt-0.5">All credit and payment records</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input className="input pl-10" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
          <option value="all">All types</option>
          <option value="CREDIT_GIVEN">Credit Given</option>
          <option value="PAYMENT_RECEIVED">Payment Received</option>
        </select>
        <select className="input" value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}>
          <option value="all">All customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 sm:p-4">
          <p className="text-xs font-semibold text-navy-500 uppercase">Showing</p>
          <p className="text-lg font-bold text-navy-900 mt-0.5">{filtered.length}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <p className="text-xs font-semibold text-red-600 uppercase">Credit</p>
          <p className="text-lg font-bold text-navy-900 mt-0.5">₹{new Intl.NumberFormat('en-IN').format(paiseToRupees(totalCredit))}</p>
        </div>
        <div className="card p-3 sm:p-4">
          <p className="text-xs font-semibold text-forest-600 uppercase">Payments</p>
          <p className="text-lg font-bold text-navy-900 mt-0.5">₹{new Intl.NumberFormat('en-IN').format(paiseToRupees(totalPayment))}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-navy-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-navy-400">No transactions match these filters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 bg-navy-50 text-xs font-semibold text-navy-500 uppercase tracking-wide">
            <div className="col-span-3">Customer</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Transcript</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          <div className="divide-y divide-navy-100">
            {filtered.map(t => (
              <div key={t.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-navy-50/50 transition">
                <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.transaction_type === 'CREDIT_GIVEN' ? 'bg-red-50 text-red-600' : 'bg-forest-50 text-forest-600'}`}>
                    {t.transaction_type === 'CREDIT_GIVEN' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-navy-900 text-sm truncate">{t.customer_name}</p>
                      {t.is_sample && <SampleBadge />}
                    </div>
                    <p className="text-xs text-navy-400 sm:hidden">{formatDateTime(t.created_at)}</p>
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2"><TypeBadge type={t.transaction_type} /></div>
                <div className="col-span-12 sm:col-span-3 text-xs text-navy-500 italic truncate hidden sm:block">
                  {t.original_transcript ? `"${t.original_transcript}"` : 'Manual entry'}
                </div>
                <div className="col-span-9 sm:col-span-2 text-xs text-navy-500 hidden sm:block">{formatDateTime(t.created_at)}</div>
                <div className="col-span-12 sm:col-span-2 text-right">
                  <p className={`font-bold text-sm ${t.transaction_type === 'CREDIT_GIVEN' ? 'text-red-600' : 'text-forest-600'}`}>
                    {t.transaction_type === 'CREDIT_GIVEN' ? '+' : '-'}₹{new Intl.NumberFormat('en-IN').format(paiseToRupees(t.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customers={customers}
        onSaved={() => { reload(); load(); }}
      />
    </div>
  );
}
