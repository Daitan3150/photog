// @ts-nocheck
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, generateText } from 'ai';
import { aiTools } from '@/lib/ai/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: any[] } = await req.json();

  // Get the latest user message
  const lastMessage = messages[messages.length - 1];
  const userPrompt = lastMessage?.content || '';

  // Simple auto-routing logic:
  // Use a fast model to classify the intent, or use regex/keywords for speed.
  // Here we use a keyword-based approach for zero latency overhead, 
  // but it can be enhanced to use generateText with gemini-1.5-flash for classification.
  
  const isComplexTask = /コード|デザイン|長文|ブログ(書|作成)|プログラム|実装/i.test(userPrompt);
  
  // Select model based on routing logic
  const model = isComplexTask 
    ? anthropic('claude-3-5-sonnet-latest') 
    : google('gemini-1.5-pro-latest');

  console.log(`[AI Copilot] Routing task to: ${isComplexTask ? 'Claude 3.5 Sonnet' : 'Gemini 1.5 Pro'}`);

  const systemPrompt = `
あなたは管理画面に常駐する「最新・自己学習型AIアシスタント（Admin Copilot）」です。
あなたは現在 ${isComplexTask ? 'Claude 3.5 Sonnet' : 'Gemini 1.5 Pro'} モデルとして動作しています。
あなたの役割は、ユーザーのサイト（ポートフォリオ、ブログ等）の管理・更新をサポートすることです。

【重要ルール】
1. 常に getMemories ツールを使ってユーザーの好みを把握し、それに従って回答してください。
2. サイトデータ（プロフィール、写真など）について聞かれたら、適宜ツールを使ってデータベースから最新の情報を取得してください。
3. ユーザーからの指示で「これは覚えておいて」といったものがあれば、saveMemory ツールを使って記憶してください。
4. 言葉遣いは親しみやすく、かつプロフェッショナルに。
`;

  const result = streamText({
    model,
    messages,
    system: systemPrompt,
    tools: aiTools,
    // @ts-ignore
    maxSteps: 3,
  });

  // @ts-ignore
  return result.toDataStreamResponse();
}
