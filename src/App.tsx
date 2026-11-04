import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { VoiceAssistant } from '@/pages/VoiceAssistant';
import { Customers } from '@/pages/Customers';
import { CustomerDetail } from '@/pages/CustomerDetail';
import { Transactions } from '@/pages/Transactions';
import { Reports } from '@/pages/Reports';
import { SettingsPage } from '@/pages/Settings';
import { useAppData } from '@/hooks/useAppData';
import { Loader2 } from 'lucide-react';

function App() {
  const { settings, customers, loading, reload } = useAppData();

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-navy-400" size={32} />
        <p className="text-sm text-navy-400">Loading Bol Khata…</p>
      </div>
    );
  }

  const shopName = settings?.shop_name ?? 'My Shop';
  const lang = settings?.preferred_language ?? 'hindi';

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout shopName={shopName} />}>
          <Route index element={<Dashboard customers={customers} reload={reload} />} />
          <Route path="voice" element={<VoiceAssistant customers={customers} preferredLanguage={lang} reload={reload} />} />
          <Route path="customers" element={<Customers customers={customers} reload={reload} />} />
          <Route path="customers/:id" element={<CustomerDetail customers={customers} preferredLanguage={lang} reload={reload} />} />
          <Route path="transactions" element={<Transactions customers={customers} reload={reload} />} />
          <Route path="reports" element={<Reports preferredLanguage={lang} />} />
          <Route path="settings" element={<SettingsPage settings={settings} reload={reload} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
