import { useState, useRef, useEffect } from 'react';
import {
  Mic, Square, Loader2, Check, X, Pencil, Volume2, RotateCcw,
  AlertTriangle, Sparkles, TrendingUp, TrendingDown, Search,
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { transcribeAudio, synthesizeSpeech, playAudioBase64 } from '@/lib/gnani';
import { parseTranscript, buildConfirmationMessage, buildBalanceMessage } from '@/utils/transactionParser';
import { findClosestCustomer, createTransaction, fetchCustomer } from '@/lib/data';
import { formatRupees, rupeesToPaise, formatDuration } from '@/utils/format';
import { toast } from '@/components/Toast';
import type { ParsedTransaction, CustomerWithStats, TransactionType, SupportedLanguage } from '@/types';

type Phase = 'idle' | 'recording' | 'transcribing' | 'review' | 'saving' | 'result';

interface VoiceAssistantProps {
  customers: CustomerWithStats[];
  preferredLanguage: SupportedLanguage;
  reload: () => Promise<void>;
}

export function VoiceAssistant({ customers, preferredLanguage, reload }: VoiceAssistantProps) {
  const recorder = useAudioRecorder();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [mode, setMode] = useState<'real' | 'mock' | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>(preferredLanguage);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Editable review fields
  const [editType, setEditType] = useState<TransactionType>('CREDIT_GIVEN');
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerWithStats | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [balanceResult, setBalanceResult] = useState<string | null>(null);
  const lastTtsRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { setLanguage(preferredLanguage); }, [preferredLanguage]);

  const reset = () => {
    setPhase('idle');
    setTranscript('');
    setParsed(null);
    setMode(null);
    setApiError(null);
    setAudioBlob(null);
    setEditType('CREDIT_GIVEN');
    setEditCustomerId('');
    setEditCustomerName('');
    setEditAmount('');
    setIsEditing(false);
    setMatchedCustomer(null);
    setMatchScore(0);
    setBalanceResult(null);
    if (lastTtsRef.current) { lastTtsRef.current.pause(); lastTtsRef.current = null; }
  };

  const handleStart = async () => {
    reset();
    await recorder.startRecording();
  };

  const handleStop = async () => {
    const blob = await recorder.stopRecording();
    if (!blob) { setPhase('idle'); return; }
    setAudioBlob(blob);
    setPhase('transcribing');
    try {
      const result = await transcribeAudio(blob, language);
      setTranscript(result.transcript);
      setMode(result.mode);
      const p = parseTranscript(result.transcript);
      setParsed(p);

      // Pre-fill review fields
      setEditType(p.intent === 'PAYMENT_RECEIVED' ? 'PAYMENT_RECEIVED' : 'CREDIT_GIVEN');
      setEditAmount(p.amount ? String(p.amount) : '');

      // Match customer
      if (p.customer_name) {
        const match = findClosestCustomer(p.customer_name, customers);
        if (match && match.score >= 60) {
          setMatchedCustomer(match.customer);
          setMatchScore(match.score);
          setEditCustomerId(match.customer.id);
          setEditCustomerName(match.customer.name);
        } else {
          setMatchedCustomer(null);
          setMatchScore(0);
          setEditCustomerName(p.customer_name);
        }
      }

      // Handle balance query immediately
      if (p.intent === 'BALANCE_QUERY' && matchCustomerId(p, customers)) {
        await handleBalanceQuery(matchCustomerId(p, customers)!);
      }

      setPhase('review');
    } catch (err: any) {
      const msg = err?.message || 'Speech recognition failed.';
      setApiError(msg);
      toast('error', msg);
      setPhase('idle');
    }
  };

  const matchCustomerId = (p: ParsedTransaction, list: CustomerWithStats[]): string | null => {
    if (!p.customer_name) return null;
    const m = findClosestCustomer(p.customer_name, list);
    return m && m.score >= 60 ? m.customer.id : null;
  };

  const handleBalanceQuery = async (customerId: string) => {
    try {
      const c = await fetchCustomer(customerId);
      if (!c) return;
      const msg = buildBalanceMessage(c.name, c.outstanding);
      setBalanceResult(msg);
      setPhase('result');
      // Speak the balance
      speakText(msg);
    } catch { /* ignore */ }
  };

  const speakText = async (text: string) => {
    try {
      const tts = await synthesizeSpeech(text, language);
      setMode(tts.mode);
      lastTtsRef.current = playAudioBase64(tts.audioBase64);
    } catch (err: any) {
      toast('error', 'Could not play voice confirmation.');
    }
  };

  const speakConfirmation = () => {
    if (parsed?.intent === 'CREDIT_GIVEN' || parsed?.intent === 'PAYMENT_RECEIVED') {
      const name = editCustomerName || 'this customer';
      const amt = parseInt(editAmount || '0', 10);
      if (amt > 0) speakText(buildConfirmationMessage(editType, name, amt));
    } else if (balanceResult) {
      speakText(balanceResult);
    }
  };

  const handleConfirm = async () => {
    if (!editCustomerId || !editAmount) {
      toast('error', 'Please select a customer and enter an amount.');
      return;
    }
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast('error', 'Amount must be greater than zero.');
      return;
    }
    setPhase('saving');
    try {
      await createTransaction({
        customer_id: editCustomerId,
        transaction_type: editType,
        amount_paise: rupeesToPaise(amount),
        original_transcript: transcript,
      });
      toast('success', `Transaction saved: ${editType === 'CREDIT_GIVEN' ? 'Credit' : 'Payment'} of ₹${amount} for ${editCustomerName}.`);
      await reload();
      setPhase('result');
      setBalanceResult(`Transaction saved. ${editCustomerName} ${editType === 'CREDIT_GIVEN' ? 'ko' : 'se'} ₹${amount} ${editType === 'CREDIT_GIVEN' ? 'udhaar diya gaya.' : 'payment receive hua.'}`);
    } catch (err: any) {
      toast('error', err.message || 'Could not save transaction.');
      setPhase('review');
    }
  };

  const handleConfirmBalanceQuery = () => {
    if (matchedCustomer) handleBalanceQuery(matchedCustomer.id);
  };

  const recording = recorder.isRecording || recorder.isInitializing;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-bold text-navy-900">Voice Assistant</h2>
        <p className="text-sm text-navy-500 mt-0.5">Speak naturally to record transactions. Hindi, English & Telugu supported.</p>
      </div>

      {/* Mode indicator */}
      {mode && (
        <div className={`flex items-center justify-center gap-2 text-xs font-semibold py-1.5 px-3 rounded-full mx-auto w-fit ${mode === 'real' ? 'bg-forest-50 text-forest-700' : 'bg-sand-100 text-sand-700'}`}>
          <Sparkles size={13} />
          {mode === 'real' ? 'Gnani AI connected' : 'Development mock mode — no Gnani credentials configured'}
        </div>
      )}

      {/* API not configured warning */}
      {apiError && phase === 'idle' && (
        <div className="card p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-800">Gnani AI Not Configured</p>
              <p className="text-xs text-red-700 mt-0.5">{apiError}</p>
              <p className="text-xs text-red-600 mt-1">Voice features require GNANI_API_KEY to be set in Supabase Edge Function secrets.</p>
            </div>
          </div>
        </div>
      )}

      {/* Language selector */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs font-semibold text-navy-500">Language:</span>
        {(['hindi', 'english', 'telugu'] as SupportedLanguage[]).map(lang => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition ${language === lang ? 'bg-navy-800 text-white' : 'bg-white text-navy-600 border border-navy-200 hover:bg-navy-50'}`}
          >
            {lang === 'english' ? 'English' : lang}
          </button>
        ))}
      </div>

      {/* Main mic card */}
      <div className="card p-6 sm:p-8 flex flex-col items-center">
        {phase === 'idle' && !recording && (
          <>
            <button
              onClick={handleStart}
              disabled={recorder.isInitializing}
              className="relative w-24 h-24 rounded-full bg-navy-800 text-white flex items-center justify-center shadow-glow-navy hover:bg-navy-700 transition-all active:scale-95 disabled:opacity-50"
              aria-label="Start recording"
            >
              {recorder.isInitializing ? <Loader2 className="animate-spin" size={32} /> : <Mic size={34} strokeWidth={2.2} />}
            </button>
            <p className="mt-4 font-semibold text-navy-800">Tap to speak</p>
            <p className="text-xs text-navy-400 mt-1 text-center max-w-xs">
              Try: "Ramesh ko 200 rupaye udhaar diya"
            </p>
          </>
        )}

        {recording && (
          <>
            <div className="relative w-24 h-24 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-red-500/15 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
              <button
                onClick={handleStop}
                className="relative w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center shadow-glow-rec hover:bg-red-700 transition-all active:scale-95"
                aria-label="Stop recording"
              >
                <Square size={28} fill="white" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="font-semibold text-red-600">Recording… {formatDuration(recorder.duration)}</p>
            </div>
            <p className="text-xs text-navy-400 mt-1">Tap stop when done speaking</p>
          </>
        )}

        {phase === 'transcribing' && (
          <>
            <div className="w-24 h-24 rounded-full bg-navy-100 text-navy-600 flex items-center justify-center">
              <Loader2 className="animate-spin" size={32} />
            </div>
            <p className="mt-4 font-semibold text-navy-800">Recognising speech…</p>
            <p className="text-xs text-navy-400 mt-1">Sending to Gnani AI Prisma</p>
          </>
        )}

        {phase === 'saving' && (
          <>
            <div className="w-24 h-24 rounded-full bg-forest-100 text-forest-600 flex items-center justify-center">
              <Loader2 className="animate-spin" size={32} />
            </div>
            <p className="mt-4 font-semibold text-navy-800">Saving transaction…</p>
          </>
        )}
      </div>

      {recorder.error && (
        <div className="card p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-800">Recording Error</p>
              <p className="text-xs text-red-700 mt-0.5">{recorder.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transcript */}
      {transcript && phase !== 'idle' && (
        <div className="card p-4 sm:p-5 animate-slide-up">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Recognised Speech</p>
          <p className="text-navy-900 text-base italic">"{transcript}"</p>
        </div>
      )}

      {/* Review / confirmation panel */}
      {phase === 'review' && parsed && (
        <div className="card p-4 sm:p-5 animate-slide-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-navy-900">
              {parsed.intent === 'BALANCE_QUERY' ? 'Balance Query' : 'Confirm Transaction'}
            </h3>
            {parsed.confidence !== 'high' && (
              <span className="badge bg-sand-100 text-sand-700">
                <AlertTriangle size={12} /> {parsed.confidence} confidence
              </span>
            )}
          </div>

          {parsed.warnings.length > 0 && (
            <div className="rounded-xl bg-sand-50 border border-sand-200 p-3 space-y-1">
              {parsed.warnings.map((w, i) => (
                <p key={i} className="text-xs text-sand-800 flex items-start gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}

          {parsed.intent === 'UNKNOWN' && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800 font-semibold">Could not understand the transaction.</p>
              <p className="text-xs text-red-700 mt-1">Please try speaking again, or use the edit option to enter details manually.</p>
            </div>
          )}

          {/* Balance query result */}
          {parsed.intent === 'BALANCE_QUERY' && (
            <div className="space-y-3">
              <div>
                <label className="label">Customer</label>
                {isEditing || !matchedCustomer ? (
                  <select className="input" value={editCustomerId} onChange={e => {
                    setEditCustomerId(e.target.value);
                    const c = customers.find(c => c.id === e.target.value);
                    setEditCustomerName(c?.name ?? '');
                    setMatchedCustomer(c ?? null);
                  }}>
                    <option value="">Select customer…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_sample ? ' (Sample)' : ''}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-navy-900">{editCustomerName}</p>
                    {matchScore >= 85 ? (
                      <span className="badge bg-forest-50 text-forest-700"><Check size={12} /> Matched</span>
                    ) : (
                      <span className="badge bg-sand-100 text-sand-700">Fuzzy match</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(!isEditing)} className="btn-outline px-3 py-2 text-sm">
                  <Pencil size={14} /> {isEditing ? 'Done' : 'Edit'}
                </button>
                <button onClick={speakConfirmation} className="btn-outline px-3 py-2 text-sm">
                  <Volume2 size={14} /> Listen
                </button>
                <button onClick={handleConfirmBalanceQuery} disabled={!editCustomerId} className="btn-success px-3 py-2 text-sm flex-1">
                  <Search size={14} /> Check Balance
                </button>
              </div>
            </div>
          )}

          {/* Transaction confirmation */}
          {(parsed.intent === 'CREDIT_GIVEN' || parsed.intent === 'PAYMENT_RECEIVED') && (
            <div className="space-y-3">
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditType('CREDIT_GIVEN')} className={`btn px-3 py-2.5 text-sm border-2 ${editType === 'CREDIT_GIVEN' ? 'border-red-500 bg-red-50 text-red-700' : 'border-navy-200 text-navy-600'}`}>
                    <TrendingUp size={15} /> Credit
                  </button>
                  <button onClick={() => setEditType('PAYMENT_RECEIVED')} className={`btn px-3 py-2.5 text-sm border-2 ${editType === 'PAYMENT_RECEIVED' ? 'border-forest-500 bg-forest-50 text-forest-700' : 'border-navy-200 text-navy-600'}`}>
                    <TrendingDown size={15} /> Payment
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Customer</label>
                <div className="flex items-center justify-between gap-2">
                  {isEditing || !matchedCustomer || matchScore < 85 ? (
                    <select className="input" value={editCustomerId} onChange={e => {
                      setEditCustomerId(e.target.value);
                      const c = customers.find(c => c.id === e.target.value);
                      setEditCustomerName(c?.name ?? editCustomerName);
                    }}>
                      <option value="">Select customer…</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_sample ? ' (Sample)' : ''}</option>)}
                    </select>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <p className="font-semibold text-navy-900">{editCustomerName}</p>
                      <span className="badge bg-forest-50 text-forest-700"><Check size={12} /> Matched</span>
                    </div>
                  )}
                </div>
                {matchedCustomer && matchScore < 85 && matchScore >= 60 && (
                  <p className="text-xs text-sand-700 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={12} /> Closest match found — please verify this is correct.
                  </p>
                )}
              </div>

              <div>
                <label className="label">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setIsEditing(!isEditing)} className="btn-outline px-3 py-2.5 text-sm">
                  <Pencil size={14} /> {isEditing ? 'Done' : 'Edit'}
                </button>
                <button onClick={speakConfirmation} className="btn-outline px-3 py-2.5 text-sm">
                  <Volume2 size={14} /> Listen
                </button>
                <button onClick={reset} className="btn-ghost px-3 py-2.5 text-sm">
                  <X size={14} /> Cancel
                </button>
                <button onClick={handleConfirm} disabled={!editCustomerId || !editAmount} className="btn-success px-3 py-2.5 text-sm flex-1">
                  <Check size={15} /> Confirm & Save
                </button>
              </div>
            </div>
          )}

          {parsed.intent === 'UNKNOWN' && (
            <div className="flex gap-2">
              <button onClick={reset} className="btn-outline flex-1"><RotateCcw size={14} /> Try Again</button>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {phase === 'result' && balanceResult && (
        <div className="card p-5 sm:p-6 text-center animate-scale-in space-y-3">
          <div className="w-14 h-14 rounded-full bg-forest-100 text-forest-600 flex items-center justify-center mx-auto">
            <Check size={28} />
          </div>
          <p className="font-semibold text-navy-900 text-lg">{balanceResult}</p>
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={speakConfirmation} className="btn-outline px-4 py-2.5 text-sm">
              <Volume2 size={15} /> Listen Again
            </button>
            <button onClick={reset} className="btn-primary px-4 py-2.5 text-sm">
              <Mic size={15} /> New Recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
