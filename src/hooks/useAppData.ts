import { useEffect, useState, useCallback } from 'react';
import { fetchSettings, fetchCustomers } from '@/lib/data';
import type { CustomerWithStats, Settings } from '@/types';

interface AppData {
  settings: Settings | null;
  customers: CustomerWithStats[];
  loading: boolean;
  reload: () => Promise<void>;
}

export function useAppData(): AppData {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [s, c] = await Promise.all([fetchSettings(), fetchCustomers()]);
    setSettings(s);
    setCustomers(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  return { settings, customers, loading, reload };
}
