import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, ArrowUpDown, Trash2, Pencil, Mic, TrendingUp, TrendingDown } from 'lucide-react';
import { BalanceDisplay, SampleBadge } from '@/components/Badges';
import { CustomerModal } from '@/components/CustomerModal';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { deleteCustomer } from '@/lib/data';
import { formatRupees, formatDate } from '@/utils/format';
import type { CustomerWithStats } from '@/types';

interface CustomersProps {
  customers: CustomerWithStats[];
  reload: () => Promise<void>;
}

type SortKey = 'name' | 'outstanding' | 'recent';
type FilterKey = 'all' | 'outstanding' | 'settled';

export function Customers({ customers, reload }: CustomersProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerWithStats | null>(null);

  useEffect(() => {
    if (params.get('action') === 'add') {
      setEditing(null);
      setModalOpen(true);
      params.delete('action');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || (c.phone ?? '').includes(s));
    }
    if (filter === 'outstanding') list = list.filter(c => c.outstanding > 0);
    if (filter === 'settled') list = list.filter(c => c.outstanding <= 0);
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'outstanding') sorted.sort((a, b) => b.outstanding - a.outstanding);
    if (sort === 'recent') sorted.sort((a, b) => {
      const ad = a.last_transaction_date ? new Date(a.last_transaction_date).getTime() : 0;
      const bd = b.last_transaction_date ? new Date(b.last_transaction_date).getTime() : 0;
      return bd - ad;
    });
    return sorted;
  }, [customers, search, sort, filter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget.id);
      toast('success', `${deleteTarget.name} and all their transactions were removed.`);
      await reload();
      setDeleteTarget(null);
    } catch (err: any) {
      toast('error', err.message || 'Could not delete customer.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Customers</h2>
          <p className="text-sm text-navy-500 mt-0.5">{customers.length} customers in your ledger</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 sm:items-center">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            className="input pl-10"
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select className="input" value={filter} onChange={e => setFilter(e.target.value as FilterKey)}>
            <option value="all">All customers</option>
            <option value="outstanding">With outstanding</option>
            <option value="settled">Fully settled</option>
          </select>
          <select className="input" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
            <option value="name">Sort: Name</option>
            <option value="outstanding">Sort: Outstanding</option>
            <option value="recent">Sort: Recent activity</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-navy-400">No customers found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 bg-navy-50 text-xs font-semibold text-navy-500 uppercase tracking-wide">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2 text-right">Total Credit</div>
            <div className="col-span-2 text-right">Total Paid</div>
            <div className="col-span-2 text-right">Outstanding</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="divide-y divide-navy-100">
            {filtered.map(c => (
              <div
                key={c.id}
                className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-navy-50/50 transition cursor-pointer"
                onClick={() => navigate(`/customers/${c.id}`)}
              >
                <div className="col-span-12 sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900 text-sm truncate">{c.name}</p>
                      <div className="flex items-center gap-1.5">
                        {c.is_sample && <SampleBadge />}
                        <span className="text-xs text-navy-400 sm:hidden">{formatRupees(c.outstanding)} due</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2 text-sm text-navy-600 hidden sm:block">
                  {c.phone && !c.is_sample ? c.phone : '—'}
                </div>
                <div className="col-span-2 text-right text-sm text-navy-700 hidden sm:block">
                  {formatRupees(c.total_credit)}
                </div>
                <div className="col-span-2 text-right text-sm text-forest-600 hidden sm:block">
                  {formatRupees(c.total_payment)}
                </div>
                <div className="col-span-6 sm:col-span-2 text-right">
                  <BalanceDisplay paise={c.outstanding} />
                </div>
                <div className="col-span-3 sm:col-span-1 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditing(c); setModalOpen(true); }} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-100 hover:text-navy-700 transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-navy-400 hover:bg-red-50 hover:text-red-600 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={reload}
        editing={editing}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Customer">
        <p className="text-sm text-navy-700">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all their transaction history. This cannot be undone.
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={() => setDeleteTarget(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1">
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
