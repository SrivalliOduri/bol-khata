# Bol Khata – Voice-Powered Digital Ledger

**Bol Khata** is a voice-enabled digital ledger designed to help small shopkeepers in India manage customer credit and payment transactions easily using natural speech.

Instead of manually entering every transaction, shopkeepers can speak in Hindi, English or Telugu. The application converts speech into text, identifies the transaction details, and updates the customer's ledger only after the shopkeeper confirms the transaction.

## 🚀 Live Application

[Open Bol Khata](https://bol-khata-voice-powe-nqch.bolt.host)

## 🎯 Problem Statement

Many small shopkeepers maintain customer credit records in notebooks or traditional khata books. Manual record-keeping can be time-consuming and may lead to calculation errors, misplaced records and difficulty tracking outstanding payments.

Bol Khata addresses these challenges through voice-based interaction and digital ledger management.

## ✨ Key Features

- **Voice-Based Transactions:** Record transactions by speaking naturally.
- **Multilingual Support:** Supports Hindi, English and Telugu.
- **Speech-to-Text:** Converts spoken input into text using Gnani AI Prisma.
- **Transaction Understanding:** Identifies customer names, amounts and transaction types.
- **Transaction Confirmation:** Displays extracted details and requires user confirmation before saving.
- **Customer Ledger:** Maintains individual customer transaction records.
- **Credit Management:** Records money given on credit.
- **Payment Tracking:** Records received payments and automatically updates outstanding balances.
- **Balance Queries:** Helps retrieve customer outstanding balances.
- **Text-to-Speech:** Uses Gnani AI Timbre to provide spoken responses.
- **Dashboard and Reports:** Provides an overview of ledger activity.

## 🔄 How It Works

1. The shopkeeper selects a preferred language.
2. The shopkeeper speaks a transaction.
3. Gnani AI Prisma converts the speech into text.
4. The transaction parser extracts the customer name, amount and intent.
5. The application displays the parsed transaction for confirmation.
6. The shopkeeper confirms the transaction.
7. The transaction is saved and the customer's outstanding balance is updated.
8. Gnani AI Timbre provides an audio response.

## 🏗️ System Architecture

```text
Shopkeeper
    |
    v
Voice Input
    |
    v
Gnani AI Prisma (Speech-to-Text)
    |
    v
Transaction Parser
    |
    v
Transaction Confirmation
    |
    v
Ledger Database
    |
    v
Balance Update
    |
    v
Gnani AI Timbre (Text-to-Speech)
    |
    v
Audio Response
```

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend Services | Supabase |
| Serverless Functions | Supabase Edge Functions |
| Speech-to-Text | Gnani AI Prisma |
| Text-to-Speech | Gnani AI Timbre |
| Development Platform | Bolt.new |

## 🌐 Supported Languages

| Language | Language Code |
|---|---|
| English | en-IN |
| Hindi | hi-IN |
| Telugu | te-IN |

The transaction parser also supports commonly used Hinglish expressions.

## 💻 Running the Project Locally

### Prerequisites

- Node.js and npm
- A Supabase project
- Gnani AI API access

### 1. Clone the Repository

```bash
git clone https://github.com/SrivalliOduri/bol-khata.git
cd bol-khata
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and configure the required Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Configure the Gnani AI API key securely as a Supabase Edge Function secret:

```text
GNANI_API_KEY
```

**Important:** Never commit `.env` files or expose private API keys in frontend code or public repositories.

### 4. Run the Application

```bash
npm run dev
```

Open the local URL displayed in your terminal.

## 🔐 Security

- Gnani AI API credentials are stored as server-side environment secrets.
- Speech processing is handled through Supabase Edge Functions.
- Transactions require explicit user confirmation before saving.
- Private credentials must not be committed to the repository.

## 🎥 Project Demonstration

**Demo Video:** [Add your recorded demonstration video link here]

## 👩‍💻 Project Information

**Project Name:** Bol Khata – Voice-Powered Digital Ledger

**Category:** AI-Powered Application

**Developed for:** The Great Indian AI Internship Challenge – Gnani AI

**GitHub Repository:** https://github.com/SrivalliOduri/bol-khata

**Live Application:** https://bol-khata-voice-powe-nqch.bolt.host

---

*Bol Khata makes everyday bookkeeping simpler, faster and more accessible through voice-powered technology.*


## 🎥 Project Demonstration

[▶ Watch Bol Khata Demo on YouTube](https://youtu.be/6Z5FF1zusAM)
