import { useState, useEffect } from 'react';
import { Store, Languages, Mic2, Save, Trash2, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { updateSettings, resetSampleData, fetchSettings } from '@/lib/data';
import { toast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import type { Settings as SettingsType, SupportedLanguage } from '@/types';

interface SettingsPageProps {
  settings: SettingsType | null;
  reload: () => Promise<void>;
}

export function SettingsPage({ settings, reload }: SettingsPageProps) {
  const [shopName, setShopName] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('hindi');
  const [voice, setVoice] = useState('default');
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [gnaniMode, setGnaniMode] = useState<'real' | 'mock' | 'not_configured' | 'unknown'>('unknown');

  useEffect(() => {
    if (settings) {
      setShopName(settings.shop_name);
      setLanguage(settings.preferred_language);
      setVoice(settings.preferred_voice);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings.id, {
        shop_name: shopName.trim() || 'My Shop',
        preferred_language: language,
        preferred_voice: voice,
      });
      await reload();
      toast('success', 'Settings saved.');
    } catch (err: any) {
      toast('error', err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetSampleData();
      await reload();
      toast('success', 'Sample data removed. Your own customers and transactions remain.');
      setResetOpen(false);
    } catch (err: any) {
      toast('error', err.message || 'Could not reset sample data.');
    }
  };

  const probeGnani = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gnani-tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'test', language }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.mode === 'not_configured') {
          setGnaniMode('not_configured');
        } else {
          setGnaniMode('unknown');
        }
        return;
      }
      const data = await res.json();
      setGnaniMode(data.mode === 'real' ? 'real' : 'unknown');
    } catch {
      setGnaniMode('not_configured');
    }
  };

  useEffect(() => { probeGnani(); }, []);

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-navy-900">Settings</h2>
        <p className="text-sm text-navy-500 mt-0.5">Configure your shop and voice preferences</p>
      </div>

      {/* Gnani AI status */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-forest-600" />
          <h3 className="font-bold text-navy-900">Gnani AI Integration</h3>
        </div>
        <div className={`rounded-xl p-3.5 ${gnaniMode === 'real' ? 'bg-forest-50 border border-forest-200' : gnaniMode === 'not_configured' ? 'bg-red-50 border border-red-200' : 'bg-navy-50 border border-navy-200'}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={gnaniMode === 'real' ? 'text-forest-600' : gnaniMode === 'not_configured' ? 'text-red-600' : 'text-navy-500'} />
            <p className="text-sm font-semibold text-navy-900">
              {gnaniMode === 'real' ? 'Connected to Gnani AI' : gnaniMode === 'not_configured' ? 'Gnani API Key Not Set' : 'Checking…'}
            </p>
          </div>
          <p className="text-xs text-navy-600 mt-1.5 leading-relaxed">
            {gnaniMode === 'real'
              ? 'Speech-to-Text (Prisma) and Text-to-Speech (Timbre) are using live Gnani AI services. API keys are configured on the server.'
              : gnaniMode === 'not_configured'
              ? 'GNANI_API_KEY is not set in Supabase Edge Function secrets. Voice features will not work until you add it. Set it in your Supabase dashboard under Edge Functions → Secrets.'
              : 'Checking connection to Gnani AI services…'}
          </p>
          <button onClick={probeGnani} className="text-xs font-semibold text-navy-600 hover:text-navy-900 mt-2 underline">
            Re-check connection
          </button>
        </div>
      </div>

      {/* Shop profile */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-navy-600" />
          <h3 className="font-bold text-navy-900">Shop Profile</h3>
        </div>
        <div>
          <label className="label">Shop Name</label>
          <input className="input" value={shopName} onChange={e => setShopName(e.target.value)} />
        </div>
      </div>

      {/* Voice & language */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Languages size={18} className="text-navy-600" />
          <h3 className="font-bold text-navy-900">Voice & Language</h3>
        </div>
        <div>
          <label className="label">Preferred Language</label>
          <select className="input" value={language} onChange={e => setLanguage(e.target.value as SupportedLanguage)}>
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
            <option value="telugu">Telugu (subject to API support)</option>
          </select>
        </div>
        <div>
          <label className="label">Preferred Voice (Timbre)</label>
          <select className="input" value={voice} onChange={e => setVoice(e.target.value)}>
            <option value="default">Default</option>
            <option value="male">Male Voice</option>
            <option value="female">Female Voice</option>
          </select>
          <p className="text-xs text-navy-400 mt-1.5">Actual voice options depend on the Gnani AI Timbre API configuration.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Settings
        </button>
      </div>

      {/* Data management */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-bold text-navy-900 mb-1">Data Management</h3>
        <p className="text-xs text-navy-500 mb-3">Remove the pre-loaded sample customers (Ramesh, Suresh, Priya, Anil) and their transactions. Your own data is not affected.</p>
        <button onClick={() => setResetOpen(true)} className="btn-outline text-red-700 border-red-200 hover:bg-red-50">
          <Trash2 size={15} /> Reset Sample Data
        </button>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Sample Data">
        <p className="text-sm text-navy-700">
          This will remove the four sample customers and all their transactions. Your own customers and transactions will remain. Continue?
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={() => setResetOpen(false)} className="btn-outline flex-1">Cancel</button>
          <button onClick={handleReset} className="btn-danger flex-1">
            <Trash2 size={15} /> Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
