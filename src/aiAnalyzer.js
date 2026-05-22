const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

export async function analyzeMarketWithAI(market) {
  const prompt = `You are a prediction market analyst. Analyze this market and estimate the true probability.

Market: "${market.question}"
Current YES price: ${(market.yesPrice * 100).toFixed(1)}% (market implied probability)
Current NO price: ${(market.noPrice * 100).toFixed(1)}%
Total Volume: $${market.volume.toLocaleString()}
Liquidity: $${market.liquidity.toLocaleString()}
24h Price Change: ${(market.change1d * 100).toFixed(1)}%
1 Week Price Change: ${(market.change1w * 100).toFixed(1)}%
End Date: ${market.endDate}

Based on your knowledge, estimate the true probability and whether this market is mispriced.

Respond ONLY in this exact JSON format with no extra text:
{
  "trueProb": 45,
  "confidence": "medium",
  "edge": 5.0,
  "reasoning": "Short explanation here.",
  "keyFactors": ["factor1", "factor2"],
  "verdict": "underpriced"
}

Rules:
- trueProb: integer 0-100
- confidence: exactly one of "low", "medium", "high"
- edge: trueProb minus market implied prob (float)
- verdict: exactly one of "overpriced", "underpriced", "fairly_priced"`;

  try {
    const response = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.log(`   ⚠️  API error: ${data.error.message}`);
      return null;
    }

    const text = data.choices?.[0]?.message?.content ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (
      typeof parsed.trueProb !== "number" ||
      typeof parsed.edge !== "number" ||
      !["low", "medium", "high"].includes(parsed.confidence) ||
      !["overpriced", "underpriced", "fairly_priced"].includes(parsed.verdict)
    ) {
      console.log(`   ⚠️  Invalid AI response structure`);
      return null;
    }

    return {
      trueProb:    parsed.trueProb / 100,
      confidence:  parsed.confidence,
      edge:        parsed.edge,
      reasoning:   parsed.reasoning ?? "-",
      keyFactors:  parsed.keyFactors ?? [],
      verdict:     parsed.verdict,
      marketPrice: market.yesPrice,
    };
  } catch (err) {
    console.log(`   ⚠️  Parse error: ${err.message}`);
    return null;
  }
}
