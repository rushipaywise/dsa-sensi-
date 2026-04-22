import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages, provider, model, systemInstruction } = await req.json();

    let aiModel;

    if (provider === 'mistral') {
      const mistral = createMistral({
        apiKey: process.env.MISTRAL_API_KEY,
      });
      aiModel = mistral(model);
    } else if (provider === 'groq') {
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      });
      aiModel = groq(model);
    } else if (provider === 'openrouter') {
      const openrouter = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      aiModel = openrouter(model);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400 });
    }

    const { text } = await generateText({
      model: aiModel,
      system: systemInstruction,
      messages: messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    });

    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
