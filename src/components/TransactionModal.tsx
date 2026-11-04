import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import type { CustomerWithStats, TransactionType } from '@/types';
import { rupeesToPaise } from '@/utils/format';
import { createTransaction } from '@/lib/data';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  customers: CustomerWithStats[];
  preselectedCustomerId?: string;
  defaultType?: TransactionType;
  transcript?: string | null;
  onSaved?: () => void;
}

export function TransactionModal({
  open, onClose, customers, preselectedCustomerId, defaultType = 'CREDIT_GIVEN', transcript, onSaved,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? '');
  const [amountStr, setAmountStr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setCustomerId(preselectedCustomerId ?? '');
      setAmountStr('');
    }
  }, [open, defaultType, preselectedCustomerId]);

  const canSave = customerId && amountStr && parseFloat(amountStr) > 0 && !saving;

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!customerId || isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      await createTransaction({
        customer_id: customerId,
        transaction_type: type,
        amount_paise: rupeesToPaise(amount),
        original_transcript: transcript ?? null,
      });
      toast('success', `${type === 'CREDIT_GIVEN' ? 'Credit' : 'Payment'} of ₹${amount} saved successfully.`);
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast('error', err.message || 'Could not save the transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Transaction">
      <div className="space-y-4">
        <div>
          <label className="label">Transaction Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('CREDIT_GIVEN')}
              className={`btn px-3 py-3 text-sm border-2 ${type === 'CREDIT_GIVEN' ? 'border-red-500 bg-red-50 text-red-700' : 'border-navy-200 bg-white text-navy-600 hover:bg-navy-50'}`}
            >
              <TrendingUp size={16} /> Credit Given
            </button>
            <button
              onClick={() => setType('PAYMENT_RECEIVED')}
              className={`btn px-3 py-3 text-sm border-2 ${type === 'PAYMENT_RECEIVED' ? 'border-forest-500 bg-forest-50 text-forest-700' : 'border-navy-200 bg-white text-navy-600 hover:bg-navy-50'}`}
            >
              <TrendingDown size={16} /> Payment Received
            </button>
          </div>
        </div>

        <div>
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">Select a customer…</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.is_sample ? ' (Sample)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Amount (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            className="input"
            placeholder="e.g. 200"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
            autoFocus
          />
        </div>

        {transcript && (
          <div className="rounded-xl bg-navy-50 px-3.5 py-3">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-1">Voice Transcript</p>
            <p className="text-sm text-navy-700 italic">"{transcript}"</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={handleSave} disabled={!canSave} className="btn-primary flex-1">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save Transaction
          </button>
        </div>
      </div>
    </Modal>
  );
}
