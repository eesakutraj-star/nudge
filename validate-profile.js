export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { country, year, age } = req.body || {};
  if (!country || !year || !age) {
    return res.status(400).json({ error: 'Missing country, year, or age' });
  }

  const system = `You validate a school profile made up of a country, a school year/grade label, and an age.

Step 1 — the year/grade label itself: accept any real, plausible label used in that country's education system (in any language), and also accept reasonable free-form descriptions like "university", "not currently in school", "homeschooled", "adult learner", "gap year". Reject only if it's gibberish, a random/arbitrary number with no real connection to any schooling stage, or clearly not a real schooling stage or description.

Step 2 — age match: work out the typical age range for that specific year/grade label in that country's education system (e.g. "Year 9" in the UK is typically ages 13-14; "Grade 3" in the US is typically ages 8-9). The given age must fall within that typical range, allowing a tolerance of about 2 years either side to account for early/late starters or grade repetition. If the age falls well outside that tolerance for a standard K-12 style grade, mark it invalid. For open-ended categories like "university", "college", "adult learner", "homeschooled", "gap year", or "not currently in school", be lenient and accept any age from roughly 16 upward, since these aren't tied to a fixed age band.

Respond with ONLY raw JSON, no markdown fences, no preamble:
{ "valid": true }
or
{ "valid": false, "reason": "one short, kind sentence explaining what to fix, e.g. mentioning the typical age range for that year/grade" }`;

  const userText = `Country: ${String(country).slice(0, 80)}\nSchool year/grade: ${String(year).slice(0, 40)}\nAge: ${String(age).slice(0, 10)}`;

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
      // if validation itself is malformed, don't block the person — fail open
      return res.status(200).json({ valid: true });
    }

    return res.status(200).json({
      valid: parsed.valid !== false,
      reason: parsed.reason || ''
    });
  } catch (err) {
    // fail open on network/server errors — don't block someone from using the app over a validation hiccup
    return res.status(200).json({ valid: true });
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
