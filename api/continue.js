export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, profile, priorSteps, notes, reflection, feedback } = req.body || {};
  if (!question || !Array.isArray(priorSteps)) {
    return res.status(400).json({ error: 'Missing question or priorSteps' });
  }

  const country = (profile && profile.country) ? String(profile.country).slice(0, 80) : '';
  const year = (profile && profile.year) ? String(profile.year).slice(0, 40) : '';
  const age = (profile && profile.age) ? String(profile.age).slice(0, 10) : '';
  const profileLine = (country || year || age)
    ? `The person is ${age ? age + ' years old, ' : ''}in school year/grade "${year || 'unspecified'}", in ${country || 'an unspecified country'}. Calibrate vocabulary and complexity accordingly.`
    : '';

  const priorSummary = priorSteps.map((s, i) =>
    `Step ${i + 1} (${s.label}): ${s.prompt}\nTheir notes: ${(notes && notes[i]) || '(none)'}`
  ).join('\n\n');

  const system = `You are a Socratic thinking guide. The person went through a guided path for their own question, wrote a conclusion, got feedback, and said they STILL don't feel like they understand. You NEVER reveal the answer, no matter how directly asked.

Your job now: produce 2-4 NEW steps that are noticeably SIMPLER and MORE BROKEN DOWN than before — smaller leaps, more concrete, more everyday language, maybe using a simpler analogy or a smaller worked example as a stepping stone before returning to their actual question. Build on what they already attempted; do not just repeat the earlier steps. ${profileLine}

Respond with ONLY raw JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "note": "one short, encouraging sentence introducing this simpler round (e.g. 'Let's slow down and take smaller steps.')",
  "steps": [
    { "label": "short 2-4 word step title", "prompt": "the guiding question or instruction, written directly to the person, simpler than before", "hint": "an even gentler nudge, still not the answer" }
  ]
}`;

  const userText = `Original question: ${question}\n\nSteps already tried:\n${priorSummary}\n\nTheir stated conclusion: ${reflection || '(none given)'}\n\nFeedback they were given: ${feedback || '(none)'}\n\nThey said they do not fully understand yet. Give them an easier path.`;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing or empty on the server' });
  }

  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }]
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
      return res.status(502).json({ error: 'The continuation came back malformed' });
    }
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return res.status(502).json({ error: 'The continuation came back incomplete' });
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
