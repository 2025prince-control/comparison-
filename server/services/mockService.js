/**
 * Mock Service for AI Benchmarking Suite
 */

function generateMockContent(prompt, provider, model) {
  const p = prompt.toLowerCase();

  if (p.includes('education') || p.includes('healthcare') || p.includes('future') || p.includes('technology')) {
    return `### The Future of Artificial Intelligence: Transforming Key Industries

Artificial Intelligence is reshaping society by augmenting human capabilities, automating repetitive cognitive workflows, and unlocking predictive breakthroughs.

#### 1. Education
- **Adaptive Tutoring**: AI tutors adjust pacing dynamically based on student mastery.
- **Benefits**: Democratized access to personalized 1-on-1 instruction.
- **Risks**: Over-reliance and diminished critical thinking if unguided.

#### 2. Healthcare
- **Diagnostic Imaging**: Neural networks detect oncological markers in pathology and radiology.
- **Benefits**: Earlier triage, higher accuracy, and reduced diagnostic backlog.
- **Risks**: Data privacy and ethical responsibility in edge diagnostic decisions.

#### 3. Technology & Business
- **Autonomous Coding & Operations**: Automated CI/CD, smart testing, and intelligent cloud optimization.
- **Benefits**: Drastic speedup in development velocity and lower operational friction.
- **Risks**: Cybersecurity threats from AI-powered malware and automated phishing.

### Conclusion
AI offers extraordinary leverage for productivity and human flourishing. Balancing innovation with rigorous safety standards ensures technology serves humanity equitably.`;
  }

  return `### Comprehensive Analysis (${model})

In response to your prompt: **"${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"**

1. **Core Findings**: Modern AI models excel when evaluated across grounded accuracy, prompt relevance, depth, and clarity.
2. **Actionable Takeaways**:
   - Compare response latencies and token usage for cost-performance tradeoffs.
   - Utilize multi-dimensional percentage scoring to evaluate outputs objectively.

Structured response generated for head-to-head comparison.`;
}

export async function executeMock({ prompt, provider, model }) {
  const baseLatency = provider === 'gemini' ? 520 : 380;
  const jitter = Math.floor(Math.random() * 150);
  const latencyMs = baseLatency + jitter;

  await new Promise(resolve => setTimeout(resolve, latencyMs));

  const text = generateMockContent(prompt, provider, model);
  const promptTokens = Math.max(12, Math.round(prompt.length / 3.8));
  const completionTokens = Math.max(45, Math.round(text.length / 3.8));

  return {
    provider,
    model: `${model} (Demo)`,
    text,
    latencyMs,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    },
    status: 'success',
    error: null,
    isDemo: true
  };
}
