// pages/api/analyze.js
// âœ… Anthropic API key à¦à¦–à¦¾à¦¨à§‡ safe - client à¦•à¦–à¦¨à§‹ à¦¦à§‡à¦–à¦¤à§‡ à¦ªà¦¾à¦¬à§‡ à¦¨à¦¾

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb", // à¦­à¦¿à¦¡à¦¿à¦“ frames à¦à¦° à¦œà¦¨à§à¦¯ à¦¬à¦¡à¦¼ limit
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { frames } = req.body;

  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    return res.status(400).json({ error: "frames array required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const imageContent = frames.map((b64) => ({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: b64 },
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `à¦¤à§à¦®à¦¿ à¦à¦•à¦œà¦¨ expert video content creator à¦à¦¬à¦‚ prompt engineerà¥¤ 
à¦­à¦¿à¦¡à¦¿à¦“à¦° à¦«à§à¦°à§‡à¦® à¦¦à§‡à¦–à§‡ style, aesthetic, mood, content à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£ à¦•à¦°à§‡ 
similar à¦­à¦¿à¦¡à¦¿à¦“ à¦¬à¦¾à¦¨à¦¾à¦¨à§‹à¦° à¦œà¦¨à§à¦¯ detailed prompts à¦²à§‡à¦–à§‹à¥¤

Response format (JSON only, no markdown, no backticks):
{
  "video_analysis": "à¦­à¦¿à¦¡à¦¿à¦“à¦Ÿà¦¿ à¦¸à¦®à§à¦ªà¦°à§à¦•à§‡ à¦¸à¦‚à¦•à§à¦·à¦¿à¦ªà§à¦¤ à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£ (2-3 à¦¬à¦¾à¦•à§à¦¯)",
  "style": "à¦­à¦¿à¦¡à¦¿à¦“à¦° visual style (à¦¸à¦‚à¦•à§à¦·à¦¿à¦ªà§à¦¤)",
  "mood": "à¦­à¦¿à¦¡à¦¿à¦“à¦° mood/tone (à¦¸à¦‚à¦•à§à¦·à¦¿à¦ªà§à¦¤)",
  "prompts": [
    {
      "title": "Prompt à¦à¦° à¦¨à¦¾à¦®",
      "platform": "YouTube/TikTok/Instagram/Sora/Kling/RunwayML",
      "prompt": "à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ prompt (à¦¬à¦¾à¦‚à¦²à¦¾à¦¯à¦¼)",
      "english_prompt": "Detailed prompt in English for AI video tools"
    }
  ]
}

à§ª-à§«à¦Ÿà¦¿ à¦†à¦²à¦¾à¦¦à¦¾ platform à¦à¦° à¦œà¦¨à§à¦¯ prompt à¦¦à¦¾à¦“à¥¤`,
        messages: [
          {
            role: "user",
            content: [
              ...imageContent,
              {
                type: "text",
                text: `à¦à¦‡ à¦­à¦¿à¦¡à¦¿à¦“à¦° ${frames.length}à¦Ÿà¦¿ à¦«à§à¦°à§‡à¦® à¦¦à§‡à¦–à§‡ à¦¬à¦¿à¦¶à§à¦²à§‡à¦·à¦£ à¦•à¦°à§‹ à¦à¦¬à¦‚ à¦à¦‡ à¦­à¦¿à¦¡à¦¿à¦“à¦° à¦®à¦¤à§‹ à¦­à¦¿à¦¡à¦¿à¦“ à¦¬à¦¾à¦¨à¦¾à¦¨à§‹à¦° à¦œà¦¨à§à¦¯ detailed prompts à¦²à§‡à¦–à§‹à¥¤`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content.map((c) => c.text || "").join("");
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: err.message });
  }
              }
