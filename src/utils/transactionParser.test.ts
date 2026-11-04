import { describe, it, expect } from 'vitest';
import { parseTranscript, buildConfirmationMessage, buildBalanceMessage } from '@/utils/transactionParser';

describe('parseTranscript — Hindi (Devanagari)', () => {
  it('parses "रमेश को 200 रुपए उधार दिया" as CREDIT_GIVEN', () => {
    const result = parseTranscript('रमेश को 200 रुपए उधार दिया।');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(200);
    expect(result.customer_name).toBeTruthy();
    expect(result.customer_name?.toLowerCase()).toContain('रमेश');
    expect(result.language).toBe('hindi');
  });

  it('parses "रमेश ने 200 रुपए वापस किए" as PAYMENT_RECEIVED', () => {
    const result = parseTranscript('रमेश ने 200 रुपए वापस किए।');
    expect(result.intent).toBe('PAYMENT_RECEIVED');
    expect(result.amount).toBe(200);
    expect(result.customer_name).toBeTruthy();
    expect(result.customer_name?.toLowerCase()).toContain('रमेश');
    expect(result.language).toBe('hindi');
  });

  it('parses "सुनीता को 500 रुपया उधार दिया" as CREDIT_GIVEN', () => {
    const result = parseTranscript('सुनीता को 500 रुपया उधार दिया।');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(500);
    expect(result.customer_name).toBeTruthy();
  });

  it('parses "प्रिया ने 150 रुपए चुकता किए" as PAYMENT_RECEIVED', () => {
    const result = parseTranscript('प्रिया ने 150 रुपए चुकता किए।');
    expect(result.intent).toBe('PAYMENT_RECEIVED');
    expect(result.amount).toBe(150);
    expect(result.customer_name).toBeTruthy();
  });

  it('parses "रमेश का कितना बाकी है" as BALANCE_QUERY', () => {
    const result = parseTranscript('रमेश का कितना बाकी है?');
    expect(result.intent).toBe('BALANCE_QUERY');
    expect(result.amount).toBeNull();
    expect(result.customer_name).toBeTruthy();
  });

  it('parses Devanagari numerals "रमेश को २०० रुपए उधार दिया"', () => {
    const result = parseTranscript('रमेश को २०० रुपए उधार दिया।');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(200);
  });
});

describe('parseTranscript — English / Hinglish (Roman script)', () => {
  it('parses "Ramesh ko 200 rupaye udhaar diya" as CREDIT_GIVEN', () => {
    const result = parseTranscript('Ramesh ko 200 rupaye udhaar diya');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(200);
    expect(result.customer_name).toBeTruthy();
    expect(result.customer_name?.toLowerCase()).toContain('ramesh');
  });

  it('parses "Ramesh ne 200 rupaye de diye" as PAYMENT_RECEIVED', () => {
    const result = parseTranscript('Ramesh ne 200 rupaye de diye');
    expect(result.intent).toBe('PAYMENT_RECEIVED');
    expect(result.amount).toBe(200);
    expect(result.customer_name).toBeTruthy();
    expect(result.customer_name?.toLowerCase()).toContain('ramesh');
  });

  it('parses "Suresh ko 500 rupaye wapas diya" as PAYMENT_RECEIVED', () => {
    const result = parseTranscript('Suresh ko 500 rupaye wapas diya');
    expect(result.intent).toBe('PAYMENT_RECEIVED');
    expect(result.amount).toBe(500);
    expect(result.customer_name).toBeTruthy();
  });

  it('parses "Priya ka kitna baaki hai" as BALANCE_QUERY', () => {
    const result = parseTranscript('Priya ka kitna baaki hai');
    expect(result.intent).toBe('BALANCE_QUERY');
    expect(result.amount).toBeNull();
    expect(result.customer_name).toBeTruthy();
  });

  it('parses "Anil ko 1000 rs udhaar diya" as CREDIT_GIVEN', () => {
    const result = parseTranscript('Anil ko 1000 rs udhaar diya');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(1000);
    expect(result.customer_name).toBeTruthy();
  });

  it('detects language as english for roman script', () => {
    const result = parseTranscript('Ramesh ko 200 rupaye udhaar diya');
    expect(result.language).toBe('english');
  });
});

describe('parseTranscript — Telugu', () => {
  it('parses "Ramesh ki 200 rupayalu aga ichanu" as CREDIT_GIVEN (roman)', () => {
    const result = parseTranscript('Ramesh ki 200 rupayalu aga ichanu');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(200);
    expect(result.customer_name).toBeTruthy();
  });

  it('parses "Ramesh tirigi 200 rupayalu ichadu" as PAYMENT_RECEIVED (roman)', () => {
    const result = parseTranscript('Ramesh tirigi 200 rupayalu ichadu');
    expect(result.intent).toBe('PAYMENT_RECEIVED');
    expect(result.amount).toBe(200);
  });

  it('parses "Ramesh ki enta aga" as BALANCE_QUERY (roman)', () => {
    const result = parseTranscript('Ramesh ki enta aga');
    expect(result.intent).toBe('BALANCE_QUERY');
    expect(result.amount).toBeNull();
  });

  it('parses Telugu script "రమేష్ కి 200 రూపాయలు అప్పు ఇచ్చాను" as CREDIT_GIVEN', () => {
    const result = parseTranscript('రమేష్ కి 200 రూపాయలు అప్పు ఇచ్చాను');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(200);
    expect(result.language).toBe('telugu');
  });

  it('parses Telugu script "రమేష్ తిరిగి 200 రూపాయలు ఇచ్చాను" as PAYMENT_RECEIVED', () => {
    const result = parseTranscript('రమేష్ తిరిగి 200 రూపాయలు ఇచ్చాను');
    expect(result.intent).toBe('PAYMENT_RECEIVED');
    expect(result.amount).toBe(200);
    expect(result.language).toBe('telugu');
  });
});

describe('parseTranscript — edge cases', () => {
  it('returns UNKNOWN for unrecognised input', () => {
    const result = parseTranscript('hello world this is a test');
    expect(result.intent).toBe('UNKNOWN');
  });

  it('handles empty transcript', () => {
    const result = parseTranscript('');
    expect(result.intent).toBe('UNKNOWN');
    expect(result.customer_name).toBeNull();
  });

  it('detects amount without currency word', () => {
    const result = parseTranscript('Ramesh ko 250 udhaar diya');
    expect(result.intent).toBe('CREDIT_GIVEN');
    expect(result.amount).toBe(250);
  });

  it('handles large amounts with commas', () => {
    const result = parseTranscript('Ramesh ko 10,000 rupaye udhaar diya');
    expect(result.amount).toBe(10000);
  });
});

describe('buildConfirmationMessage', () => {
  it('builds credit confirmation in Hinglish', () => {
    const msg = buildConfirmationMessage('CREDIT_GIVEN', 'Ramesh', 200);
    expect(msg).toContain('Ramesh');
    expect(msg).toContain('200');
    expect(msg).toContain('udhaar');
  });

  it('builds payment confirmation in Hinglish', () => {
    const msg = buildConfirmationMessage('PAYMENT_RECEIVED', 'Suresh', 500);
    expect(msg).toContain('Suresh');
    expect(msg).toContain('500');
    expect(msg).toContain('payment');
  });
});

describe('buildBalanceMessage', () => {
  it('reports outstanding balance', () => {
    const msg = buildBalanceMessage('Ramesh', 30000);
    expect(msg).toContain('Ramesh');
    expect(msg).toContain('300');
  });

  it('reports zero balance', () => {
    const msg = buildBalanceMessage('Anil', 0);
    expect(msg).toContain('nahi');
  });
});
