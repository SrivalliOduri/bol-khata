import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { Loader2, UserPlus } from 'lucide-react';
import { createCustomer, updateCustomer } from '@/lib/data';
import type { CustomerWithStats } from '@/types';

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: CustomerWithStats | null;
}

export function CustomerModal({ open, onClose, onSaved, editing }: CustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setPhone(editing?.phone && !editing.phone.startsWith('sample-') ? '' : '');
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('error', 'Customer name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCustomer(editing.id, name.trim(), phone.trim() || null);
        toast('success', 'Customer updated.');
      } else {
        await createCustomer(name.trim(), phone.trim() || null);
        toast('success', `${name.trim()} added to your customers.`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast('error', err.message || 'Could not save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Customer' : 'Add Customer'}>
      <div className="space-y-4">
        <div>
          <label className="label">Customer Name</label>
          <input
            className="input"
            placeholder="e.g. Ramesh"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Phone Number (Optional)</label>
          <input
            className="input"
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            inputMode="tel"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {editing ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
