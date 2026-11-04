import type { ParsedTransaction, SupportedLanguage, TransactionType } from '@/types';

/**
 * Deterministic parser for Hindi (Devanagari), English (Roman/Hinglish), and Telugu voice transcripts.
 * Extracts intent (CREDIT_GIVEN | PAYMENT_RECEIVED | BALANCE_QUERY),
 * customer name, and amount from spoken expressions.
 *
 * No LLM dependency — purely rule-based with keyword + regex matching.
 * Supports both Devanagari script and Roman transliteration.
 */

interface KeywordSet {
  credit: string[];
  payment: string[];
  balance: string[];
}

const KEYWORDS: Record<SupportedLanguage, KeywordSet> = {
  hindi: {
    // Devanagari
    credit: [
      'उधार दिया', 'उधार दिया है', 'उधार देना', 'उधार दे दिया', 'उधार दे दी',
      'नकद दिया', 'क्रेडिट दिया', 'बाकी में जोड़', 'बकाया में जोड़',
      'udhaar diya', 'udhar diya', 'udhaar diya hai', 'udhaar dena', 'add karo',
      'credit diya', 'baaki mein add', 'nakad diya',
    ],
    payment: [
      'वापस किए', 'वापस किया', 'वापस दिए', 'वापस दिया', 'पैसे दिए', 'पैसे दे दिए',
      'चुकता किए', 'चुकता किया', 'चुकता कर दिया', 'भुगतान दिया', 'भुगतान किया', 'जमा दिया', 'जमा किया',
      'वसूली हुई', 'वसूली की', 'क्लियर किया', 'चुका दिया', 'वापसी की',
      'wapas diye', 'wapas diya', 'chukta kiya', 'chukta kar diya',
      'payment diya', 'payment diye', 'receive hue', 'receive hua',
      'paisa diya', 'paisa diye', 'jama diya', 'jama hua',
      'vasooli hui', 'vasuli hui', 'clear kiya', 'chuka diya',
    ],
    balance: [
      'कितना उधार', 'कितना बाकी', 'कितना बकाया', 'कितना पड़ा', 'कितना लंबित',
      'बैलेंस क्या है', 'बाकी क्या है', 'बकाया क्या है', 'उधार कितना है',
      'बचा कितना', 'बाकी है', 'कितना बाकी है',
      'kitna udhaar', 'kitna baaki', 'kitna baki', 'kitna udhaar baaki',
      'kitna pending', 'balance kya hai', 'baaki kya hai', 'baki kya hai',
      'udhaar kitna hai', 'bacha kitna', 'baaki hai',
    ],
  },
  english: {
    // Roman/Hinglish — same keywords, no Devanagari
    credit: [
      'udhaar diya', 'udhar diya', 'udhaar diya hai', 'udhar diya hai',
      'add karo', 'credit diya', 'credit karo', 'udhaar add',
      'gave credit', 'gave on credit', 'on credit',
    ],
    payment: [
      'wapas diye', 'wapas diya', 'payment diya', 'payment diye',
      'payment kiya', 'receive hue', 'receive hua', 'paisa diye',
      'paisa diya', 'jama diya', 'clear kiya', 'chukta kiya', 'chuka diya',
      'paid back', 'returned money', 'de diye', 'de diya',
    ],
    balance: [
      'kitna udhaar', 'kitna baaki', 'kitna baki', 'kitna pending',
      'balance kya hai', 'baaki kya hai', 'baki kya hai', 'udhaar kitna hai',
      'bacha kitna', 'baaki hai', 'outstanding kya hai',
      'how much', 'what is the balance', 'how much pending',
    ],
  },
  telugu: {
    credit: [
      'అప్పు ఇచ్చాను', 'అప్పు ఇచ్చింది', 'క్రెడిట్ ఇచ్చాను', 'జోడించు',
      'aga ichanu', 'aga ichindi', 'credit ichanu', 'add cheyyi', 'credita ichanu',
    ],
    payment: [
      'తిరిగి ఇచ్చాను', 'తిరిగి ఇచ్చింది', 'చెల్లించాను', 'జమ చేశాను',
      'tirigi ichanu', 'tirigi ichindi', 'tirigi ichadu', 'tirigi',
      'pay chesanu', 'payment ichanu', 'techesanu', 'jama chesanu',
      'తిరిగి',
    ],
    balance: [
      'ఎంత అప్పు', 'ఎంత మిగిలింది', 'బాకీ ఎంత', 'బ్యాలెన్స్ ఎంత',
      'enta aga', 'enta migilindi', 'balance enti', 'baki enti', 'bagi enti',
    ],
  },
};

// Stopwords for name extraction — covers Hindi (Devanagari + Roman), English, Telugu
const NAME_STOPWORDS = new Set([
  // Roman Hindi/English
  'ko', 'ne', 'se', 'ka', 'ki', 'ke', 'kaun', 'kya', 'kitna', 'kitni', 'kitne',
  'rupaye', 'rupya', 'rs', 'rupoorte', 'rupay', 'udhaar', 'udhar', 'diya', 'diye',
  'wapas', 'chukta', 'payment', 'receive', 'hue', 'hua', 'paisa', 'jama',
  'add', 'karo', 'hai', 'baki', 'baaki', 'pending', 'balance', 'bacha',
  'the', 'a', 'tha', 'thi', 'clear', 'chuka', 'vasooli', 'vasuli',
  'main', 'me', 'woh', 'wo', 'yeh', 'ye', 'usko', 'mujhe', 'usne',
  'is', 'given', 'to', 'from', 'by', 'paid', 'back', 'returned', 'money',
  'credit', 'how', 'much', 'what', 'on', 'outstanding',
  // Devanagari Hindi
  'को', 'ने', 'से', 'का', 'की', 'के', 'कौन', 'क्या', 'कितना', 'कितनी', 'कितने',
  'रुपए', 'रुपया', 'रुपय', 'उधार', 'दिया', 'दिए', 'वापस', 'चुकता', 'भुगतान',
  'जमा', 'पैसे', 'वसूली', 'क्लियर', 'चुका', 'बाकी', 'बकाया', 'लंबित', 'बचा',
  'है', 'था', 'थी', 'मैं', 'मुझे', 'उसने', 'वह', 'यह', 'पड़ा',
  // Telugu (Roman + script)
  'enta', 'migilindi', 'enti', 'ichanu', 'ichindi', 'aga', 'tirigi', 'pay',
  'chesanu', 'techesanu', 'jama', 'credita', 'అప్పు', 'ఇచ్చాను', 'ఇచ్చింది',
  'తిరిగి', 'చెల్లించాను', 'జమ', 'చేశాను', 'ఎంత', 'మిగిలింది', 'బాకీ',
  'బ్యాలెన్స్', 'క్రెడిట్', 'జోడించు',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    // Preserve commas between digits (thousands separators) before stripping punctuation
    .replace(/(\d),(\d)/g, '$1$2')
    // Devanagari danda and punctuation
    .replace(/[।॥?!,.]/g, ' ')
    // Normalize Devanagari numerals to Arabic
    .replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)))
    // Telugu numerals
    .replace(/[౦-౯]/g, d => String('౦౧౨౩౪౫౬౭౮౯'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAmount(text: string): number | null {
  // Hindi/English: "200 rupaye", "rupaye 200", "₹200", "200 rs", "200 रुपए"
  // Telugu: "200 rupayalu"
  // Try patterns with currency word first, then bare number.
  // Use \d[\d,]* to greedily capture comma-separated digits, then strip commas.
  const patterns = [
    /(\d[\d,]*)\s*(?:rupaye|rupya|rupay|rs|rupees|r|₹|रुपए|रुपया|रुपय|rupayalu)/i,
    /(?:rupaye|rupya|rupay|rs|rupees|₹|रुपए|रुपया|रुपय|rupayalu)\s*(\d[\d,]*)/i,
    /(\d[\d,]*)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const num = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}

function findKeyword(text: string, list: string[]): string | null {
  let best: string | null = null;
  let bestLen = 0;
  for (const kw of list) {
    if (text.includes(kw) && kw.length > bestLen) {
      best = kw;
      bestLen = kw.length;
    }
  }
  return best;
}

function extractName(text: string, matchedKeyword: string | null): string | null {
  let work = text;
  if (matchedKeyword) {
    work = work.replace(matchedKeyword, ' ');
  }
  // Remove amount phrases
  const amountPatterns = [
    /\d+(?:,\d{3})*\s*(?:rupaye|rupya|rupay|rs|rupees|r|₹|रुपए|रुपया|रुपय|rupayalu)?/gi,
    /(?:rupaye|rupya|rupay|rs|rupees|₹|रुपए|रुपया|रुपय|rupayalu)\s*\d+(?:,\d{3})*/gi,
  ];
  for (const p of amountPatterns) {
    work = work.replace(p, ' ');
  }
  // Remove grammatical particles and fillers (Devanagari + Roman + Telugu)
  const fillers = [
    'ne', 'ko', 'se', 'ka', 'ki', 'ke', 'kya', 'main', 'me', 'hai', 'tha', 'thi',
    'को', 'ने', 'से', 'का', 'की', 'के', 'क्या', 'मैं', 'मुझे', 'है', 'था', 'थी',
    'ichanu', 'ichindi', 'chesanu',
    'కో', 'ను', 'చే', 'is', 'to', 'from', 'by', 'the', 'a',
  ];
  for (const f of fillers) {
    work = work.replace(new RegExp(`\\b${f}\\b`, 'g'), ' ');
  }
  const tokens = work.split(/\s+/).filter(t => t.length > 0 && !NAME_STOPWORDS.has(t) && !/^\d+$/.test(t));
  if (tokens.length === 0) return null;
  const cleaned = tokens.filter(t => t.length >= 2);
  if (cleaned.length === 0) return tokens.join(' ');
  // Capitalize first letter of each word for display
  return cleaned.join(' ').replace(/\b\w/g, c => c.toUpperCase());
}

function detectLanguage(text: string): SupportedLanguage {
  const t = text.toLowerCase();
  // Telugu script characters (Unicode range 0C00-0C7F)
  if (/[\u0c00-\u0c7f]/.test(t)) return 'telugu';
  if (/telugu|aga|migilindi|ichanu|ichindi|tirigi|chesanu|entha|enta/i.test(t)) return 'telugu';
  // Devanagari script characters (Unicode range 0900-097F)
  if (/[\u0900-\u097f]/.test(t)) return 'hindi';
  // If it has Roman script but Hindi/English keywords, default to english
  // (since Devanagari is already handled above, roman transcripts go to english)
  return 'english';
}

export function parseTranscript(rawTranscript: string): ParsedTransaction {
  const transcript = rawTranscript.trim();
  const normalized = normalize(transcript);
  const language = detectLanguage(normalized);
  const kws = KEYWORDS[language];
  const warnings: string[] = [];

  const balanceKw = findKeyword(normalized, kws.balance);
  const creditKw = findKeyword(normalized, kws.credit);
  const paymentKw = findKeyword(normalized, kws.payment);

  let intent: ParsedTransaction['intent'] = 'UNKNOWN';
  let matchedKw: string | null = null;

  if (balanceKw) {
    intent = 'BALANCE_QUERY';
    matchedKw = balanceKw;
  } else if (creditKw && paymentKw) {
    if (normalized.indexOf(creditKw) < normalized.indexOf(paymentKw)) {
      intent = 'CREDIT_GIVEN';
      matchedKw = creditKw;
    } else {
      intent = 'PAYMENT_RECEIVED';
      matchedKw = paymentKw;
    }
  } else if (creditKw) {
    intent = 'CREDIT_GIVEN';
    matchedKw = creditKw;
  } else if (paymentKw) {
    intent = 'PAYMENT_RECEIVED';
    matchedKw = paymentKw;
  }

  const customer_name = extractName(normalized, matchedKw);
  const amount = intent === 'BALANCE_QUERY' ? null : extractAmount(normalized);

  if (intent !== 'BALANCE_QUERY' && intent !== 'UNKNOWN' && !amount) {
    warnings.push('Amount not detected — please enter the amount manually.');
  }
  if (!customer_name) {
    warnings.push('Customer name not detected — please select or enter a customer.');
  }

  let confidence: ParsedTransaction['confidence'] = 'low';
  if (intent !== 'UNKNOWN' && customer_name && (intent === 'BALANCE_QUERY' || amount)) {
    confidence = 'high';
  } else if (intent !== 'UNKNOWN' && (customer_name || amount)) {
    confidence = 'medium';
  }

  return {
    intent,
    customer_name,
    amount,
    language,
    transcript,
    confidence,
    warnings,
  };
}

export function buildConfirmationMessage(
  intent: TransactionType,
  customerName: string,
  amount: number,
): string {
  const rupees = amount;
  if (intent === 'CREDIT_GIVEN') {
    return `${customerName} ko ${rupees} rupaye udhaar diya ja raha hai. Kya yeh sahi hai?`;
  }
  return `${customerName} se ${rupees} rupaye payment receive hua hai. Kya main ise save karun?`;
}

export function buildBalanceMessage(customerName: string, outstandingPaise: number): string {
  const rupees = Math.round(outstandingPaise / 100);
  if (rupees <= 0) {
    return `${customerName} ka koi udhaar baaki nahi hai.`;
  }
  return `${customerName} ka ${rupees} rupaye udhaar baaki hai.`;
}
