import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Mic, Volume2, Loader2 } from 'lucide-react';
import { fetchCustomer, fetchCustomerTransactions } from '@/lib/data';
import { TransactionModal } from '@/components/TransactionModal';
import { TypeBadge, SampleBadge, BalanceDisplay } from '@/components/Badges';
import { formatRupees, formatDateTime, paiseToRupees } from '@/utils/format';
import { buildBalanceMessage } from '@/utils/transactionParser';
import { synthesizeSpeech, playAudioBase64 } from '@/lib/gnani';
import { toast } from '@/components/Toast';
import type { CustomerWithStats, TransactionWithCustomer, TransactionType, SupportedLanguage } from '@/types';

interface CustomerDetailProps {
  customers: CustomerWithStats[];
  preferredLanguage: SupportedLanguage;
  reload: () => Promise<void>;
}

export function CustomerDetail({ customers, preferredLanguage, reload }: CustomerDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('CREDIT_GIVEN');
  const [speaking, setSpeaking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [c, t] = await Promise.all([fetchCustomer(id), fetchCustomerTransactions(id)]);
    setCustomer(c);
    setTransactions(t);
    setLoading(false);
  }, [id]);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const openTx = (type: TransactionType) => {
    setTxType(type);
    setTxModalOpen(true);
  };

  const speakBalance = async () => {
    if (!customer) return;
    setSpeaking(true);
    try {
      const msg = buildBalanceMessage(customer.name, customer.outstanding);
      const tts = await synthesizeSpeech(msg, preferredLanguage);
      playAudioBase64(tts.audioBase64);
    } catch {
      toast('error', 'Could not play voice.');
    } finally {
      setSpeaking(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-navy-400" /></div>;
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-navy-400">Customer not found.</p>
        <button onClick={() => navigate('/customers')} className="btn-outline mt-4">Back to Customers</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => navigate('/customers')} className="btn-ghost -ml-2">
        <ArrowLeft size={16} /> Back to Customers
      </button>

      {/* Customer header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-lg">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-navy-900">{customer.name}</h2>
                {customer.is_sample && <SampleBadge />}
              </div>
              <p className="text-sm text-navy-500">{customer.phone && !customer.is_sample ? customer.phone : 'No phone'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">Outstanding</p>
            <BalanceDisplay paise={customer.outstanding} className="text-2xl" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-600 uppercase">Total Credit</p>
            <p className="text-lg font-bold text-navy-900 mt-1">{formatRupees(customer.total_credit)}</p>
          </div>
          <div className="rounded-xl bg-forest-50 p-3">
            <p className="text-xs font-semibold text-forest-600 uppercase">Total Paid</p>
            <p className="text-lg font-bold text-navy-900 mt-1">{formatRupees(customer.total_payment)}</p>
          </div>
          <div className="rounded-xl bg-navy-50 p-3">
            <p className="text-xs font-semibold text-navy-600 uppercase">Transactions</p>
            <p className="text-lg font-bold text-navy-900 mt-1">{customer.transaction_count}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={() => openTx('CREDIT_GIVEN')} className="btn px-2 py-2.5 text-xs sm:text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-100">
            <TrendingUp size={15} /> Give Credit
          </button>
          <button onClick={() => openTx('PAYMENT_RECEIVED')} className="btn px-2 py-2.5 text-xs sm:text-sm bg-forest-50 text-forest-700 hover:bg-forest-100 border border-forest-100">
            <TrendingDown size={15} /> Record Payment
          </button>
          <button onClick={speakBalance} disabled={speaking} className="btn px-2 py-2.5 text-xs sm:text-sm bg-navy-50 text-navy-700 hover:bg-navy-100 border border-navy-100">
            {speaking ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />} Ask Balance
          </button>
        </div>
      </div>

      {/* Transaction history */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-bold text-navy-900 mb-3">Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-navy-400">No transactions yet for {customer.name}.</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-100">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.transaction_type === 'CREDIT_GIVEN' ? 'bg-red-50 text-red-600' : 'bg-forest-50 text-forest-600'}`}>
                  {t.transaction_type === 'CREDIT_GIVEN' ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={t.transaction_type} />
                    <span className="text-xs text-navy-400">{formatDateTime(t.created_at)}</span>
                  </div>
                  {t.original_transcript && (
                    <p className="text-xs text-navy-400 italic mt-1 truncate">"{t.original_transcript}"</p>
                  )}
                </div>
                <p className={`font-bold text-sm shrink-0 ${t.transaction_type === 'CREDIT_GIVEN' ? 'text-red-600' : 'text-forest-600'}`}>
                  {t.transaction_type === 'CREDIT_GIVEN' ? '+' : '-'}₹{new Intl.NumberFormat('en-IN').format(paiseToRupees(t.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        customers={customers}
        preselectedCustomerId={customer.id}
        defaultType={txType}
        onSaved={() => { reload(); load(); }}
      />
    </div>
  );
}
