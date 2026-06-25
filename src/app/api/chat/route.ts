// @ts-nocheck
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { aiTools } from '@/lib/ai/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: any[] } = await req.json();

  // Always use Gemini 2.0 Flash (latest, fastest, most capable free model)
  const model = google('gemini-2.0-flash-001');

  const systemPrompt = `
あなたは管理画面に常駐する「最新・自己学習型AIアシスタント（Admin Copilot）」です。
あなたは Gemini 2.0 Flash として動作しています。
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
