# AI Model Selection & Benchmarking Suite

An end-to-end, full-stack benchmarking and evaluation platform that compares distinct Artificial Intelligence model architectures and hyperparameter configurations head-to-head on identical prompts.

Built with a **Node.js/Express** backend and an **ultra-clean White Theme** web interface, powered exclusively by a single **Google Gemini API key**.

---

## 📌 Executive Summary & Academic Focus

In production AI engineering and academic research, choosing an AI model involves balancing **accuracy**, **relevance**, **completeness**, **clarity**, **execution latency**, and **token consumption**.

This platform addresses the core question:
> *"Given the same prompt, how does a flagship multimodal foundation model perform compared to a distilled, lightweight architecture?"*

### Model Architectures Compared:
1. **Google Gemini 3.5 Flash (Flagship Architecture)**
   - Full-scale foundation model designed for deep reasoning, multimodal comprehension, and comprehensive synthesis.
   - Measured Latency: `~3,500ms – 4,000ms`.
2. **Google Gemini 3.5 Flash-Lite (Lightweight Architecture)**
   - Distilled, low-latency architecture optimized for high-throughput, real-time edge responses and cost efficiency.
   - Measured Latency: `~1,100ms – 1,500ms` (**~3.3× faster**).
3. **Hyperparameter Profiles (Temperature Sensitivity Analysis)**:
   - **Creative Profile (Temperature 1.0)**: Evaluates stochasticity, creative exploration, and divergence.
   - **Precise Profile (Temperature 0.2)**: Evaluates deterministic, low-entropy factual responses.

---

## 🚀 Key Features

### 1. Concurrent Multi-Model Execution
- **Single Prompt Ingestion**: Users enter a single prompt, which is dispatched concurrently to both selected models via `Promise.allSettled`.
- **Fault-Tolerant Execution**: If one model encounters a transient rate limit or network delay, the other model still completes and displays without breaking the suite.
- **Uncapped Output Delivery**: Configured with an **8,192 token limit**, preventing output truncation and allowing complete multi-paragraph answers and code blocks.

### 2. Multi-Dimensional Percentage Scoring (0% – 100%)
Responses are evaluated across four weighted dimensions:
* **🎯 Accuracy (35%)**: Factual soundness, correct reasoning, and technical validity.
* **📌 Relevance (25%)**: Direct adherence to the prompt constraints, format, and intent.
* **📦 Completeness (20%)**: Thoroughness of topic coverage and missing-concept penalty.
* **✨ Clarity (20%)**: Readability, sentence flow, formatting, and structural organization.

$$\text{Overall Score (\%)} = (\text{Acc} \times 0.35) + (\text{Rel} \times 0.25) + (\text{Comp} \times 0.20) + (\text{Clar} \times 0.20)$$

* **Automatic Ranking**: Models are ranked (#1 Winner vs #2 Place) and the winner is highlighted with an amber gold card border and winner badge (`🥇 #1 Winner`).
* **Interactive Sliders**: Evaluators can manually adjust each factor slider live (0%–100%) to test custom weighting.

### 3. Clean Modern UI & Developer Tools
* **Minimalist White Theme**: Clean `#f8fafc` background, crisp `#ffffff` cards, modern slate typography, and dedicated scroll containers.
* **Live Performance Profiling**: Shows exact wall-clock latency (ms) and authentic token usage (`prompt`, `completion`, and `total` tokens).
* **One-Click Demo Mode**: Built-in simulated responses and evaluations for offline presentation backup if venue Wi-Fi is unavailable.
* **Benchmark History & CSV Export**: Automatically logs all benchmark runs with timestamps and provides instant one-click CSV download.

---

## 🏗️ Architecture & Technology Stack

```
AI Tools/
├── package.json                   # Dependencies & npm scripts
├── .env.example                   # Environment variable template
├── .env                           # Local server secrets (Git-ignored)
├── README.md                      # Complete system documentation
├── server/
│   ├── index.js                   # Express server, REST endpoints, and router
│   ├── services/
│   │   ├── geminiService.js       # Google Gemini API connector (8192 token window)
│   │   ├── evaluatorService.js    # Percentage scoring engine, weights, and ranking
│   │   └── mockService.js         # Offline Demo Mode simulation engine
│   ├── utils/
│   │   └── validators.js          # Request payload and score boundary validation
│   ├── data/
│   │   └── historyStore.js        # Persistent benchmark run store & history API
│   └── tests/
│       ├── benchmark.test.js      # Unit tests (validators, scoring formula, bounds)
│       └── e2e.test.js            # Integration tests (dual execution in memory)
└── public/
    ├── index.html                 # Single-page comparison workspace
    ├── css/
    │   └── style.css              # Clean white theme, scrollbars, card typography
    └── js/
        └── app.js                 # Frontend state, dynamic sliders, API orchestration
```

### Stack Components:
* **Runtime**: Node.js (ES Modules)
* **Backend Framework**: Express.js, CORS, Dotenv
* **AI API Integration**: Google Gemini REST API (v1beta)
* **Frontend**: Vanilla ES6+ JavaScript, Tailwind CSS, Marked.js (Markdown parsing), Lucide Icons
* **Testing**: Node.js built-in test runner (`node --test`)

---

## ⚡ Quickstart Guide

### 1. Prerequisites
* **Node.js** v18.0.0 or higher (compatible with Node v20, v22, v26).
* A free **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).

### 2. Installation
Clone the repository or navigate to the project directory:
```bash
cd "AI Tools"
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```ini
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key_here
```
> *Security Note:* `.env` is listed in `.gitignore`. API keys are kept strictly on the backend server and are never sent to the browser.

### 4. Run the Application
Start the server:
```bash
npm start
```
For auto-reloading development mode:
```bash
npm run dev
```

Open your browser at:
👉 **`http://localhost:3000`**

### 5. Running the Test Suite
Run the automated unit and integration tests:
```bash
npm test
```
All 9 test suites verify payload validation, scoring boundary limits (0%–100%), weighted score calculation, ranking logic, and partial failure recovery.

---

## 📊 Google AI Studio Free Quotas & Presentation Readiness

Your single Gemini API key runs under the Google AI Studio Free Tier with the following rolling limits:

| Quota Metric | Free Tier Allocation | Presentation Practical Capacity |
| :--- | :--- | :--- |
| **Requests Per Day (RPD)** | **1,500 requests / day** | Allows **750 complete side-by-side benchmark comparisons** every 24 hours. Resets daily. |
| **Tokens Per Minute (TPM)** | **1,000,000 tokens / min** | A standard comparison uses ~2,500 tokens total (<0.3% of capacity). |
| **Requests Per Minute (RPM)** | **15 requests / min** | Allows up to **7 dual comparisons per minute** without hitting rate limits. |
| **Cost** | **$0.00** | 100% free; no credit card or prepaid credit requirement. |

### Presentation Fail-Safe (Demo Mode)
If presenting in a classroom or auditorium with poor network connectivity, toggle the **"Demo Mode"** switch in the top header. It generates instant, authentic simulated responses and multi-factor evaluations locally without requiring internet access.

---

## 🚀 Deployment (Vercel & Git)

### 1. Initialize Git & Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Gemini AI Benchmark Suite"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New"** → **"Project"**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   * **Key**: `GEMINI_API_KEY`
   * **Value**: *(Your Google Gemini API Key)*
5. Click **"Deploy"**. Vercel will build and deploy your project live with an instant `.vercel.app` URL!

---

## 📄 License
ISC License. Developed for AI Model Benchmarking, Research, and Educational Demonstrations.
