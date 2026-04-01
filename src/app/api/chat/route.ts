import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod/v4";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

function getGeminiDirect() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

function getModel(provider: string) {
  if (provider === "claude") {
    return anthropic("claude-sonnet-4-20250514");
  }
  return google("gemini-2.5-flash");
}

export async function POST(req: Request) {
  const { messages, ...body } = await req.json();
  const provider: string = body.provider || "gemini";

  const cosmeCheckUrl = process.env.COSME_CHECK_URL || "http://localhost:3001";
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: getModel(provider),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      checkSafety: tool({
        description:
          "CosmeCheck安全性チェッカーと連携して、化粧品成分の安全性を分析します。処方に含まれる成分の安全性評価、各国の規制情報、成分間の相互作用リスクを取得できます。処方の成分リストが出てきたら積極的に使ってください。",
        inputSchema: z.object({
          ingredients: z
            .string()
            .describe(
              "安全性をチェックしたい成分のリスト（カンマ区切り）。例: 精製水, グリセリン, BG, セラミドNP"
            ),
        }),
        execute: async ({ ingredients }) => {
          try {
            const res = await fetch(`${cosmeCheckUrl}/api/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ingredients }),
            });

            if (!res.ok) {
              return {
                error: `CosmeCheck API error: ${res.status}`,
                ingredients,
              };
            }

            return await res.json();
          } catch {
            return {
              error: `CosmeCheckに接続できません（${cosmeCheckUrl}）。CosmeCheckが起動しているか確認してください。`,
              ingredients,
            };
          }
        },
      }),

      researchIngredient: tool({
        description:
          "Gemini AIを使って化粧品成分の科学的根拠、最新研究、文献情報を調査します。成分の作用機序、臨床データ、安定性情報など、より深い技術情報が必要な場合に使ってください。",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "調査したい内容。例: セラミドNPの肌バリア機能への作用機序と推奨配合量"
            ),
        }),
        execute: async ({ query }) => {
          const gemini = getGeminiDirect();
          if (!gemini) {
            return {
              error: "GOOGLE_GENERATIVE_AI_API_KEY が設定されていません",
              query,
            };
          }

          try {
            const prompt = `あなたは化粧品原料と処方開発の専門家です。以下の質問に対して、科学的根拠に基づいた正確な情報を提供してください。

質問: ${query}

以下の観点で回答してください：
- 成分の作用機序（どのように機能するか）
- 科学的エビデンス・臨床データ（あれば）
- 推奨配合量と配合時の注意点
- 安定性・相性の問題
- 安全性に関する知見（刺激性、感作性、光毒性等）

日本語で回答してください。不確実な情報は「エビデンス不十分」と明記してください。`;

            const result = await gemini.generateContent(prompt);
            const text = result.response.text();

            return {
              source: "Gemini AI（科学文献ベース調査）",
              query,
              findings: text,
            };
          } catch (error) {
            return {
              error: `Gemini API エラー: ${error instanceof Error ? error.message : String(error)}`,
              query,
            };
          }
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
