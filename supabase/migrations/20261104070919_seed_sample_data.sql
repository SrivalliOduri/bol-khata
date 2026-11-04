/*
# Bol Khata — Seed Sample Data

1. Purpose
- Insert clearly-labelled fictional sample customers and transactions for demonstration.
- Insert a default settings row.

2. Sample Balances (Outstanding = Credit - Payment)
- Ramesh: Credit 500, Payment 200 -> Outstanding 300
- Suresh: Credit 800, Payment 300 -> Outstanding 500
- Priya:  Credit 250, Payment 100 -> Outstanding 150
- Anil:   Credit 400, Payment 400 -> Outstanding 0

3. Idempotency
- Uses a DO block to only insert if the sample customers do not already exist (matched by name + phone).

4. Important
- This migration only inserts data; it does not alter schema.
*/

DO $$
DECLARE
  ramesh_id uuid;
  suresh_id uuid;
  priya_id uuid;
  anil_id uuid;
BEGIN
  -- Only seed if no sample customers exist yet
  IF NOT EXISTS (SELECT 1 FROM customers WHERE phone LIKE 'sample-%') THEN

    INSERT INTO customers (name, phone, created_at)
    VALUES ('Ramesh', 'sample-ramesh', now() - interval '14 days')
    RETURNING id INTO ramesh_id;

    INSERT INTO customers (name, phone, created_at)
    VALUES ('Suresh', 'sample-suresh', now() - interval '12 days')
    RETURNING id INTO suresh_id;

    INSERT INTO customers (name, phone, created_at)
    VALUES ('Priya', 'sample-priya', now() - interval '10 days')
    RETURNING id INTO priya_id;

    INSERT INTO customers (name, phone, created_at)
    VALUES ('Anil', 'sample-anil', now() - interval '8 days')
    RETURNING id INTO anil_id;

    -- Ramesh: 500 credit, 200 payment -> 300 outstanding
    INSERT INTO transactions (customer_id, transaction_type, amount, original_transcript, created_at, confirmation_status) VALUES
      (ramesh_id, 'CREDIT_GIVEN', 50000, 'Ramesh ko 500 rupaye udhaar diya', now() - interval '14 days', 'CONFIRMED'),
      (ramesh_id, 'PAYMENT_RECEIVED', 20000, 'Ramesh ne 200 rupaye wapas diye', now() - interval '7 days', 'CONFIRMED');

    -- Suresh: 800 credit, 300 payment -> 500 outstanding
    INSERT INTO transactions (customer_id, transaction_type, amount, original_transcript, created_at, confirmation_status) VALUES
      (suresh_id, 'CREDIT_GIVEN', 80000, 'Suresh ko 800 rupaye udhaar diya', now() - interval '12 days', 'CONFIRMED'),
      (suresh_id, 'PAYMENT_RECEIVED', 30000, 'Suresh se 300 rupaye receive hue', now() - interval '5 days', 'CONFIRMED');

    -- Priya: 250 credit, 100 payment -> 150 outstanding
    INSERT INTO transactions (customer_id, transaction_type, amount, original_transcript, created_at, confirmation_status) VALUES
      (priya_id, 'CREDIT_GIVEN', 25000, 'Priya ko 250 rupaye udhaar diya', now() - interval '10 days', 'CONFIRMED'),
      (priya_id, 'PAYMENT_RECEIVED', 10000, 'Priya ne 100 rupaye diye', now() - interval '3 days', 'CONFIRMED');

    -- Anil: 400 credit, 400 payment -> 0 outstanding
    INSERT INTO transactions (customer_id, transaction_type, amount, original_transcript, created_at, confirmation_status) VALUES
      (anil_id, 'CREDIT_GIVEN', 40000, 'Anil ko 400 rupaye udhaar diya', now() - interval '8 days', 'CONFIRMED'),
      (anil_id, 'PAYMENT_RECEIVED', 40000, 'Anil ne 400 rupaye wapas diye', now() - interval '1 days', 'CONFIRMED');

  END IF;

  -- Ensure a settings row exists
  IF NOT EXISTS (SELECT 1 FROM settings) THEN
    INSERT INTO settings (shop_name, preferred_language, preferred_voice)
    VALUES ('Bol Khata Demo Shop', 'hindi', 'default');
  END IF;
END $$;
