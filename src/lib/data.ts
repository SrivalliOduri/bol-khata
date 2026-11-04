import { supabase } from '@/lib/supabase';
import type {
  Customer,
  CustomerWithStats,
  Transaction,
  TransactionType,
  TransactionWithCustomer,
  Settings,
  DashboardStats,
  WeeklyPoint,
} from '@/types';
import { RUPEE, todayRange, isSameDay } from '@/utils/format';

const SAMPLE_PHONE_PREFIX = 'sample-';

export function isSampleCustomer(c: { phone: string | null }): boolean {
  return !!c.phone && c.phone.startsWith(SAMPLE_PHONE_PREFIX);
}

function toCustomerWithStats(row: any): CustomerWithStats {
  const total_credit = row.total_credit ?? 0;
  const total_payment = row.total_payment ?? 0;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_credit,
    total_payment,
    outstanding: total_credit - total_payment,
    last_transaction_date: row.last_transaction_date,
    transaction_count: row.transaction_count ?? 0,
    is_sample: isSampleCustomer(row),
  };
}

export async function fetchCustomers(): Promise<CustomerWithStats[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      customer_id,
      transaction_type,
      amount,
      confirmation_status,
      created_at,
      customers!inner(id, name, phone, created_at, updated_at)
    `)
    .eq('confirmation_status', 'CONFIRMED');
  if (error) throw error;

  const byCustomer = new Map<string, any>();
  for (const t of data ?? []) {
    const c = t.customers as any;
    if (!byCustomer.has(c.id)) {
      byCustomer.set(c.id, {
        id: c.id, name: c.name, phone: c.phone,
        created_at: c.created_at, updated_at: c.updated_at,
        total_credit: 0, total_payment: 0,
        last_transaction_date: null, transaction_count: 0,
      });
    }
    const entry = byCustomer.get(c.id)!;
    entry.transaction_count += 1;
    if (t.transaction_type === 'CREDIT_GIVEN') entry.total_credit += t.amount;
    else entry.total_payment += t.amount;
    if (!entry.last_transaction_date || new Date(t.created_at) > new Date(entry.last_transaction_date)) {
      entry.last_transaction_date = t.created_at;
    }
  }

  // Also include customers with zero transactions
  const { data: allCustomers, error: cErr } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
  if (cErr) throw cErr;

  for (const c of allCustomers ?? []) {
    if (!byCustomer.has(c.id)) {
      byCustomer.set(c.id, {
        ...c,
        total_credit: 0, total_payment: 0,
        last_transaction_date: null, transaction_count: 0,
      });
    }
  }

  return Array.from(byCustomer.values())
    .map(toCustomerWithStats)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCustomer(id: string): Promise<CustomerWithStats | null> {
  const { data: c, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!c) return null;

  const { data: txns, error: tErr } = await supabase
    .from('transactions')
    .select('transaction_type, amount, created_at, confirmation_status')
    .eq('customer_id', id)
    .eq('confirmation_status', 'CONFIRMED');
  if (tErr) throw tErr;

  let total_credit = 0, total_payment = 0;
  let lastDate: string | null = null;
  for (const t of txns ?? []) {
    if (t.transaction_type === 'CREDIT_GIVEN') total_credit += t.amount;
    else total_payment += t.amount;
    if (!lastDate || new Date(t.created_at) > new Date(lastDate)) lastDate = t.created_at;
  }

  return toCustomerWithStats({
    ...c,
    total_credit, total_payment,
    last_transaction_date: lastDate,
    transaction_count: txns?.length ?? 0,
  });
}

export async function createCustomer(name: string, phone: string | null): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, phone: phone || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, name: string, phone: string | null): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ name, phone: phone || null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTransactions(filters?: {
  customerId?: string;
  type?: TransactionType;
  fromDate?: string;
  toDate?: string;
  search?: string;
}): Promise<TransactionWithCustomer[]> {
  let q = supabase
    .from('transactions')
    .select(`
      id, customer_id, transaction_type, amount, original_transcript,
      created_at, confirmation_status,
      customers!inner(id, name, phone)
    `)
    .eq('confirmation_status', 'CONFIRMED')
    .order('created_at', { ascending: false });

  if (filters?.customerId) q = q.eq('customer_id', filters.customerId);
  if (filters?.type) q = q.eq('transaction_type', filters.type);
  if (filters?.fromDate) q = q.gte('created_at', filters.fromDate);
  if (filters?.toDate) q = q.lte('created_at', filters.toDate);

  const { data, error } = await q;
  if (error) throw error;

  let rows = (data ?? []).map((t: any) => ({
    id: t.id,
    customer_id: t.customer_id,
    transaction_type: t.transaction_type,
    amount: t.amount,
    original_transcript: t.original_transcript,
    created_at: t.created_at,
    confirmation_status: t.confirmation_status,
    customer_name: t.customers?.name ?? 'Unknown',
    customer_phone: t.customers?.phone ?? null,
    is_sample: isSampleCustomer({ phone: t.customers?.phone ?? null }),
  })) as TransactionWithCustomer[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    rows = rows.filter(t =>
      t.customer_name.toLowerCase().includes(s) ||
      (t.original_transcript ?? '').toLowerCase().includes(s)
    );
  }

  return rows;
}

export async function fetchCustomerTransactions(customerId: string): Promise<TransactionWithCustomer[]> {
  return fetchTransactions({ customerId });
}

export async function createTransaction(input: {
  customer_id: string;
  transaction_type: TransactionType;
  amount_paise: number;
  original_transcript?: string | null;
}): Promise<Transaction> {
  if (input.amount_paise <= 0) throw new Error('Amount must be greater than zero.');

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      customer_id: input.customer_id,
      transaction_type: input.transaction_type,
      amount: input.amount_paise,
      original_transcript: input.original_transcript ?? null,
      confirmation_status: 'CONFIRMED',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data: txns, error } = await supabase
    .from('transactions')
    .select('transaction_type, amount, created_at')
    .eq('confirmation_status', 'CONFIRMED');
  if (error) throw error;

  const { count: total_customers, error: cErr } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });
  if (cErr) throw cErr;

  let total_credit = 0, total_payments = 0;
  let today_credit = 0, today_payments = 0, today_transactions = 0;
  const { start } = todayRange();

  for (const t of txns ?? []) {
    if (t.transaction_type === 'CREDIT_GIVEN') {
      total_credit += t.amount;
      if (isSameDay(new Date(t.created_at), start)) today_credit += t.amount;
    } else {
      total_payments += t.amount;
      if (isSameDay(new Date(t.created_at), start)) today_payments += t.amount;
    }
    if (isSameDay(new Date(t.created_at), start)) today_transactions += 1;
  }

  return {
    total_outstanding: total_credit - total_payments,
    total_payments,
    total_credit,
    total_customers: total_customers ?? 0,
    today_transactions,
    today_credit,
    today_payments,
  };
}

export async function fetchWeeklyData(): Promise<WeeklyPoint[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_type, amount, created_at')
    .eq('confirmation_status', 'CONFIRMED')
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
  if (error) throw error;

  const days: WeeklyPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      date: d.toISOString(),
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      credit: 0, payment: 0, count: 0,
    });
  }

  for (const t of data ?? []) {
    const td = new Date(t.created_at);
    const day = days.find(d => isSameDay(new Date(d.date), td));
    if (day) {
      if (t.transaction_type === 'CREDIT_GIVEN') day.credit += Math.round(t.amount / RUPEE);
      else day.payment += Math.round(t.amount / RUPEE);
      day.count += 1;
    }
  }

  return days;
}

export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSettings(id: string, patch: Partial<Pick<Settings, 'shop_name' | 'preferred_language' | 'preferred_voice'>>): Promise<void> {
  const { error } = await supabase.from('settings').update(patch).eq('id', id);
  if (error) throw error;
}

export async function resetSampleData(): Promise<void> {
  // Delete sample customers (cascades to their transactions)
  const { error } = await supabase
    .from('customers')
    .delete()
    .like('phone', `${SAMPLE_PHONE_PREFIX}%`);
  if (error) throw error;
}

export function findClosestCustomer(
  query: string,
  customers: CustomerWithStats[],
): { customer: CustomerWithStats; score: number } | null {
  const q = query.toLowerCase().trim();
  if (!q || customers.length === 0) return null;

  let best: { customer: CustomerWithStats; score: number } | null = null;
  for (const c of customers) {
    const name = c.name.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 85;
    else if (name.includes(q)) score = 75;
    else if (q.includes(name)) score = 70;
    else {
      // Simple character overlap ratio
      const setQ = new Set(q.replace(/\s/g, ''));
      const setName = new Set(name.replace(/\s/g, ''));
      let common = 0;
      for (const ch of setName) if (setQ.has(ch)) common++;
      score = (common / Math.max(setName.size, 1)) * 50;
    }
    if (!best || score > best.score) {
      best = { customer: c, score };
    }
  }
  return best;
}
