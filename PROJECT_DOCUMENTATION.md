# AI Model Selection & Benchmarking Suite
## Project Overview, Development Prompts & System Workflow

* **Live Cloud URL:** [https://comparison-rust.vercel.app/](https://comparison-rust.vercel.app/)
* **GitHub Repository:** [https://github.com/2025prince-control/comparison-](https://github.com/2025prince-control/comparison-)

---

## 1. Project Overview
The **AI Model Selection & Benchmarking Suite** is a full-stack evaluation application designed to compare distinct Artificial Intelligence model architectures simultaneously. Users provide a single prompt, which is dispatched concurrently to two models: **Google Gemini 3.5 Flash** and **Google Gemini 3.5 Flash-Lite**. 

The system records empirical telemetry (latency in milliseconds, token counts) and evaluates both outputs across a 0%–100% multi-factor scoring rubric (Accuracy, Relevance, Completeness, Clarity), crowning the winning model with a gold badge.

---

## 2. Prompts Used to Build the Project

### Prompt 1: Initial System Architecture & Foundation
> *"Act as a senior full-stack developer. Upgrade my AI Tool Selection and Benchmarking System to compare models side by side. Allow users to enter one prompt and send the exact same prompt to multiple models. Show loading states, errors, response time, and token usage. Evaluate each response using a scoring system for Accuracy, Relevance, Completeness, and Clarity. Calculate a weighted overall score out of 100 and rank the models. Ensure backend security with API keys in .env, safe error handling, and reliability with partial results preservation."*

### Prompt 2: Provider Consolidation (Single Gemini Key Architecture)
> *"Remove OpenAI and Ollama. I am using only Google Gemini so remove all other AI tools and extra columns from the code. Confirm that we are using only one Gemini key, and in that we are using different models."*

### Prompt 3: UI Simplification & Percentage Evaluation
> *"Make the UI simpler. There should not be too many things—just the prompt and the comparison benchmarks. Make the UI clean and in a white theme. The accuracy and factor scores should change in percentage; the default must start at 0% and then change properly after comparison."*

### Prompt 4: Output Token Fix & Quota Verification
> *"Why am I not able to see the whole answer of the AI? And how many credits and tokens do I have left to present tomorrow with testing and workflow?"*

### Prompt 5: Dual Architecture Model Selection (Flash vs Flash-Lite)
> *"Why is Gemini 3.8 Flash failing every time? If my professor asks that we compare two truly different models, what should we use?"*

### Prompt 6: Cloud Deployment to Vercel
> *"Put this in a GitHub repo and deploy it to Vercel so that it can be accessed live on the web."*

---

## 3. How the System Works (End-to-End Workflow)

* **Step 1: Prompt Ingestion:** The user enters a single prompt or selects from quick templates (e.g., Future of AI, TypeScript Debounce, SQL vs NoSQL). The user chooses Model A (Left) and Model B (Right).
* **Step 2: Concurrent Non-Blocking Execution:** The backend dispatches the identical prompt to both Gemini models in parallel using asynchronous non-blocking requests (`Promise.allSettled`). Neither model waits for the other.
* **Step 3: Performance Telemetry Collection:** The server measures exact round-trip latency (ms) and tracks token usage (prompt, completion, and total tokens). An 8,192 token output limit ensures reasoning steps never truncate the final answer.
* **Step 4: Multi-Dimensional Percentage Scoring:** Both responses are graded across four weighted criteria (0%–100%):
  * **Accuracy (35% Weight):** Factual validity, logical soundness, and technical precision.
  * **Relevance (25% Weight):** Direct adherence to prompt requirements and instructions.
  * **Completeness (20% Weight):** Thoroughness of coverage without omitting key points.
  * **Clarity (20% Weight):** Readability, formatting, and structural organization.
  
  $$\text{Weighted Overall Score (\%)} = (\text{Accuracy} \times 0.35) + (\text{Relevance} \times 0.25) + (\text{Completeness} \times 0.20) + (\text{Clarity} \times 0.20)$$

* **Step 5: Visual Presentation & Dynamic Ranking:** The frontend updates both cards side-by-side, animates percentage sliders from 0% to the evaluated scores, and crowns the winning model with a gold `#1 Winner` badge and amber highlight. Evaluators can manually adjust sliders to explore custom weightings.

---

## 4. The Two Models Compared

1. **Google Gemini 3.5 Flash (Flagship Architecture):** Full multimodal foundation model designed for deep reasoning, complex problem solving, and comprehensive answers. Measured latency: `~3,500ms – 4,000ms`.
2. **Google Gemini 3.5 Flash-Lite (Lightweight Architecture):** Distilled, low-latency architecture optimized for rapid real-time execution and compute efficiency. Measured latency: `~1,100ms – 1,500ms` (**over 3.3× faster**).

---

## 5. Presentation Safety Net (3-Layer Architecture)

* **Layer 1 (Cloud Production):** Live globally on Vercel at [https://comparison-rust.vercel.app/](https://comparison-rust.vercel.app/).
* **Layer 2 (Local Server):** Runs locally on port 3000 (`http://localhost:3000`) using `npm start`.
* **Layer 3 (Offline Demo Mode):** Built-in 1-click toggle in the header generates realistic simulated comparisons and evaluations locally, with zero internet or API dependency if venue Wi-Fi fails.

