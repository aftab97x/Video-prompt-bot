// pages/api/analyze.js
// ✅ Groq API key is safe here - client cannot access this

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
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

  if (frames.length > 10) {
    return res.status(400).json({ error: "Maximum 10 frames allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    // Groq শুধু ১টা image নেয়, তাই মাঝের frame ব্যবহার করি
    const middleFrame = frames[Math.floor(frames.length / 2)];

    const prompt = `You are an expert video content creator and prompt engineer.
Analyze the style, aesthetic, mood, and content from the video frame provided,
then write detailed prompts to recreate similar videos.

Response format (JSON only, no markdown, no backticks):
{
  "video_analysis": "Brief analysis of the video (2-3 sentences)",
  "style": "Visual style of the video (brief)",
  "mood": "Mood/tone of the video (brief)",
  "prompts": [
    {
      "title": "Name of the prompt",
      "platform": "YouTube/TikTok/Instagram/Sora/Kling/RunwayML",
      "prompt": "Detailed prompt in Bengali",
      "english_prompt": "Detailed prompt in English for AI video tools"
    }
  ]
}

Provide prompts for 4-5 different platforms.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${middleFrame}`,
                },
              },
              {
                type: "text",
                text: prompt,
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

    const text = data.choices[0].message.content;
    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: err.message });
  }
}
