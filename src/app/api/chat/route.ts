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

      checkRegulation: tool({
        description:
          "化粧品規制チェッカーと連携して、特定の国における化粧品の規制・レギュレーションを調査します。輸出先の国の規制、成分規制、ラベリング要件、届出制度などを確認できます。処方の海外展開や輸出が話題になったら使ってください。",
        inputSchema: z.object({
          country: z
            .string()
            .describe("対象国名。例: 台湾, 中国, EU, アメリカ, 韓国, タイ"),
          itemType: z
            .string()
            .describe(
              "製品アイテム。例: 化粧水, クリーム, 日焼け止め, 美容液, シャンプー"
            ),
          formulation: z
            .string()
            .optional()
            .describe(
              "処方の成分リスト（任意）。例: 精製水 80%, グリセリン 5%, BG 3%..."
            ),
        }),
        execute: async ({ country, itemType, formulation }) => {
          const gemini = getGeminiDirect();
          if (!gemini) {
            return {
              error: "GOOGLE_GENERATIVE_AI_API_KEY が設定されていません",
            };
          }

          try {
            const systemPrompt = `あなたは化粧品の国際規制に精通した専門家です。各国の化粧品規制、成分規制、ラベリング要件、届出・登録制度について正確な情報を提供します。

回答は以下の構成で記載してください：

1. 規制概要（関連法令、管轄官庁）
2. 製品分類（その国でのカテゴリー）
3. 成分規制（禁止成分、制限成分、必須表示成分）
4. ラベリング・表示要件（必要項目、言語要件）
5. 届出・登録制度（手続き、必要書類、期間）
6. 安全性評価（必要な試験・評価項目）
7. その他の留意事項（輸入規制、動物試験禁止状況等）

処方が提供された場合は追加で：
8. 処方成分の規制チェック結果（各成分の適合性）
9. 処方の総合評価（修正が必要な点、推奨事項）

具体的な数値や法令名を含め、日本語で回答してください。`;

            let prompt = `【対象国】${country}\n【製品アイテム】${itemType}\n\n`;
            if (formulation) {
              prompt += `【処方内容】\n${formulation}\n\n`;
              prompt += `上記の処方について、${country}における化粧品規制を詳細にチェックしてください。`;
            } else {
              prompt += `${country}における${itemType}に関する化粧品規制・レギュレーションを詳細にまとめてください。`;
            }

            const result = await gemini.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              systemInstruction: {
                role: "model",
                parts: [{ text: systemPrompt }],
              },
              generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
            });

            return {
              source: "Gemini AI（化粧品規制チェッカー）",
              country,
              itemType,
              hasFormulation: !!formulation,
              findings: result.response.text(),
            };
          } catch (error) {
            return {
              error: `規制チェックエラー: ${error instanceof Error ? error.message : String(error)}`,
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
