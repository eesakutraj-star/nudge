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

  const system = `You are a Socratic thinking guide. The person worked through a guided reasoning path for their own question and has now written their own conclusion. NEVER state whether a factual answer is "correct" by revealing it yourself, and never supply the answer if they haven't essentially arrived at it themselves. Instead, respond in 2-4 sentences: point out where their reasoning is solid, and if there's a gap or shaky step, ask a pointed follow-up question that sends them back to check it rather than fixing it for them. Warm, direct, no fluff, no markdown.`;

  const userText = `Original question: ${question}\n\nGuided path so far:\n${summary}\n\nTheir stated conclusion: ${reflection}`;

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
    return res.status(200).json({ feedback: text });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
