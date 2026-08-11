export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, profile } = req.body || {};
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Missing question' });
  }

  const country = (profile && profile.country) ? String(profile.country).slice(0, 80) : '';
  const year = (profile && profile.year) ? String(profile.year).slice(0, 40) : '';
  const age = (profile && profile.age) ? String(profile.age).slice(0, 10) : '';
  const profileLine = (country || year || age)
    ? `The person is ${age ? age + ' years old, ' : ''}in school year/grade "${year || 'unspecified'}", in ${country || 'an unspecified country'}. Calibrate vocabulary, complexity, and any curriculum or subject references (e.g. what topics would be familiar at that age/grade in that country's education system) to suit them specifically. Do not mention their age, year, or country back to them explicitly — just let it shape the steps.`
    : '';

  const system = `You are a Socratic thinking guide. You NEVER state the final answer to the person's question, no matter how directly they ask, and you never hint so strongly the answer becomes obvious from step 1. Break the path to an answer into 4-6 sequential steps that build on each other, each prompting the person to reason, recall, calculate, or investigate something themselves, calibrated to the specific question (not generic advice like "do some research").
${profileLine}

Respond with ONLY raw JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "reframe": "a one-sentence restatement of what's really being asked, in an inviting tone",
  "steps": [
    { "label": "short 2-4 word step title", "prompt": "the guiding question or instruction, written directly to the person", "hint": "a gentle nudge to show alongside this step, still not the answer" }
  ]
}`;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing or empty on the server' });
  }

  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: question.trim() }] }]
        })
      }
    );

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: 'Upstream error', detail });
    }

    const data = await r.json();
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || '').join('\n').trim();
    const jsonStr = extractJson(text);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      return res.status(502).json({ error: 'The guide came back malformed' });
    }
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return res.status(502).json({ error: 'The guide came back incomplete' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}

function extractJson(t) {
  let s = t.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = s.slice(first, last + 1);
    try { JSON.parse(candidate); return candidate; } catch (e) { /* fall through */ }
  }
  return s;
}
