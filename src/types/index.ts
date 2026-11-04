export type TransactionType = 'CREDIT_GIVEN' | 'PAYMENT_RECEIVED';
export type ConfirmationStatus = 'CONFIRMED' | 'CANCELLED';
export type SupportedLanguage = 'hindi' | 'english' | 'telugu';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithStats extends Customer {
  total_credit: number;
  total_payment: number;
  outstanding: number;
  last_transaction_date: string | null;
  transaction_count: number;
  is_sample: boolean;
}

export interface Transaction {
  id: string;
  customer_id: string;
  transaction_type: TransactionType;
  amount: number;
  original_transcript: string | null;
  created_at: string;
  confirmation_status: ConfirmationStatus;
}

export interface TransactionWithCustomer extends Transaction {
  customer_name: string;
  customer_phone: string | null;
  is_sample: boolean;
}

export interface Settings {
  id: string;
  shop_name: string;
  preferred_language: SupportedLanguage;
  preferred_voice: string;
  created_at: string;
}

export interface ParsedTransaction {
  intent: TransactionType | 'BALANCE_QUERY' | 'UNKNOWN';
  customer_name: string | null;
  amount: number | null;
  language: SupportedLanguage;
  transcript: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface DashboardStats {
  total_outstanding: number;
  total_payments: number;
  total_credit: number;
  total_customers: number;
  today_transactions: number;
  today_credit: number;
  today_payments: number;
}

export interface WeeklyPoint {
  date: string;
  label: string;
  credit: number;
  payment: number;
  count: number;
}
