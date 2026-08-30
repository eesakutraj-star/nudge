export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, steps, notes, reflection } = req.body || {};
  if (!question || !Array.isArray(steps) || !reflection) {
    return res.status(400).json({ error: 'Missing question, steps, or reflection' });
  }

  const summary = steps.map((s, i) =>
    `Step ${i + 1} (${s.label}): ${s.prompt}\nTheir notes: ${(notes && notes[i]) || '(none)'}`
  ).join('\n\n');

  const system = `You are a Socratic thinking guide. The person worked through a guided reasoning path for their own question and has now written their own conclusion. NEVER state the correct answer yourself, and never supply it even indirectly if they haven't essentially arrived at it themselves.

Privately assess how close their conclusion and reasoning are to being correct and complete. Then respond with ONLY raw JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "feedback": "2-4 sentences, warm and direct, no markdown: point out where their reasoning is solid, and if there's a gap or shaky step, ask a pointed follow-up question that sends them back to check it rather than fixing it for them",
  "assessment": "solid" | "partial" | "far_off",
  "recommendContinue": true or false
}

Set "assessment" to "far_off" and "recommendContinue" to true if their reasoning has a major flaw, a wrong core idea, or misses the point of the question substantially. Set "assessment" to "partial" and "recommendContinue" to true if they're on the right track but have a real gap. Set "assessment" to "solid" and "recommendContinue" to false only if their reasoning is essentially sound, even if not perfectly phrased.`;

  const userText = `Original question: ${question}\n\nGuided path so far:\n${summary}\n\nTheir stated conclusion: ${reflection}`;

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
      // fall back to treating the raw text as plain feedback if structure parsing fails
      return res.status(200).json({ feedback: text, assessment: 'partial', recommendContinue: false });
    }
    if (!parsed || !parsed.feedback) {
      return res.status(502).json({ error: 'The feedback came back incomplete' });
    }

    return res.status(200).json({
      feedback: parsed.feedback,
      assessment: parsed.assessment || 'partial',
      recommendContinue: !!parsed.recommendContinue
    });
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
