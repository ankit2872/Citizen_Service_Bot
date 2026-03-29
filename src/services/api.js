import { GoogleGenAI } from "@google/genai";
import schemesData from '../data/schemes.json';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log("SevaBot Init — API Key present:", !!API_KEY);

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/**
 * Main chatbot function using new @google/genai SDK
 */
export const queryChatbot = async (query, lang = 'English') => {
  if (!ai || !API_KEY) {
    return {
      answer: "⚠️ **API Key Missing**: Add `VITE_GEMINI_API_KEY` to your `.env` file and **restart** the dev server.",
      source: "Configuration Error",
      success: false
    };
  }

  // Build local context from schemes database
  const contextStr = schemesData.data.map(s =>
    `[${s.title}]: ${s.paragraphs.map(p => p.context).join(' ')}`
  ).join('\n\n');

  const langInstruction = lang !== 'English'
    ? `IMPORTANT: You MUST reply entirely in ${lang} language. Translate all content to ${lang}.`
    : '';

  const prompt = `You are SevaBot, an official Smart Governance Assistant for Indian Citizen Services.
${langInstruction}

KNOWLEDGE BASE:
${contextStr}

USER QUESTION: ${query}

INSTRUCTIONS:
- Answer using the knowledge base if relevant, otherwise use your general knowledge about Indian government schemes.
- Be specific, helpful, empathetic and structured.
- Use markdown: **bold**, bullet points, numbered steps.
- Never say you cannot answer if you know the information.
- ${lang !== 'English' ? `ALL text in your answer must be in ${lang}. Do not mix languages.` : 'Reply in English.'}

Reply ONLY with valid JSON:
{"answer": "your detailed formatted answer here", "source": "scheme name or General AI Knowledge", "success": true}`;

  // Try models in order — first success wins
  // gemini-3-flash-preview is the user's AI Studio model (primary)
  const MODELS = [
    "gemini-3-flash-preview",
    "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`SevaBot: Trying model → ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });

      const rawText = response.text;
      console.log(`SevaBot: ✅ ${model} responded`);

      // Extract JSON from response
      const jsonMatch = rawText.match(/\{[\s\S]*?"answer"[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (_) {
          return { answer: rawText, source: model, success: true };
        }
      }
      return { answer: rawText, source: model, success: true };

    } catch (error) {
      console.warn(`SevaBot: ${model} failed — ${error.message}`);
      lastError = error;
      // Continue to next model
    }
  }

  // All models failed — report exact error
  return {
    answer: `⚠️ **AI Error**: ${lastError?.message}\n\nPlease check your API key at https://aistudio.google.com/app/apikey`,
    source: "Technical Error",
    success: false
  };
};

/**
 * Local keyword matching (emergency fallback only)
 */
export async function localQuery(query) {
  const q = query.toLowerCase();
  let bestMatch = null;
  let highestScore = 0;
  let source = null;

  schemesData.data.forEach(scheme => {
    scheme.paragraphs.forEach(para => {
      para.qas.forEach(qa => {
        const question = qa.question.toLowerCase();
        let score = 0;
        q.split(' ').forEach(word => {
          if (word.length > 3 && question.includes(word)) score += 2;
          if (word.length > 3 && scheme.title.toLowerCase().includes(word)) score += 3;
        });
        if (score > highestScore) {
          highestScore = score;
          bestMatch = qa.answers[0]?.text;
          source = scheme.title;
        }
      });
    });
  });

  if (highestScore > 3) {
    return { answer: bestMatch, source, success: true };
  }

  return {
    answer: "I couldn't find that in my local database. Please ensure your AI connection is active.",
    source: null,
    success: false
  };
}
