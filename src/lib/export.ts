import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import type { SavedMessage } from "./history";

function messagesToText(messages: SavedMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "【ユーザー】" : "【AI】";
      const text = m.parts
        .map((p) => {
          if (p.type === "text") return p.text || "";
          if (p.type?.toString().startsWith("tool-")) {
            const output = p.output as Record<string, unknown> | undefined;
            if (output?.findings) return `[Gemini調査結果]\n${output.findings}`;
            if (output?.ingredients)
              return `[CosmeCheck安全性レポート]\n${JSON.stringify(output, null, 2)}`;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
      return `${role}\n${text}`;
    })
    .join("\n\n" + "─".repeat(50) + "\n\n");
}

export async function exportToWord(
  title: string,
  messages: SavedMessage[]
): Promise<void> {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `エクスポート日時: ${new Date().toLocaleString("ja-JP")}`,
          size: 18,
          color: "888888",
        }),
      ],
      spacing: { after: 400 },
    }),
  ];

  for (const msg of messages) {
    const role = msg.role === "user" ? "ユーザー" : "AI";

    paragraphs.push(
      new Paragraph({
        text: role,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    for (const part of msg.parts) {
      if (part.type === "text" && part.text) {
        const lines = (part.text as string).split("\n");
        for (const line of lines) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 22 })],
              spacing: { after: 80 },
            })
          );
        }
      }

      if (part.type?.toString().startsWith("tool-") && part.output) {
        const output = part.output as Record<string, unknown>;
        if (output.findings) {
          paragraphs.push(
            new Paragraph({
              text: "【Gemini調査結果】",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200 },
            })
          );
          const lines = (output.findings as string).split("\n");
          for (const line of lines) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: line, size: 20 })],
                spacing: { after: 60 },
              })
            );
          }
        }
        if (output.overallAssessment) {
          paragraphs.push(
            new Paragraph({
              text: "【CosmeCheck安全性レポート】",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200 },
            })
          );
          const ingredients = output.ingredients as Array<Record<string, unknown>> | undefined;
          if (ingredients) {
            for (const ing of ingredients) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${ing.name} (${ing.inci || "-"})`,
                      bold: true,
                      size: 22,
                    }),
                    new TextRun({
                      text: ` — ${ing.safetyRating}`,
                      size: 22,
                      color:
                        ing.safetyRating === "安全"
                          ? "059669"
                          : ing.safetyRating === "注意"
                            ? "D97706"
                            : "DC2626",
                    }),
                  ],
                  spacing: { before: 100 },
                })
              );
              if (ing.description) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: ing.description as string,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 60 },
                  })
                );
              }
            }
          }
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `総合評価: ${output.overallAssessment}`,
                  size: 20,
                  italics: true,
                }),
              ],
              spacing: { before: 100, after: 100 },
            })
          );
        }
      }
    }
  }

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}.docx`);
}

export function exportToExcel(
  title: string,
  messages: SavedMessage[]
): void {
  const rows: Record<string, string>[] = [];

  for (const msg of messages) {
    for (const part of msg.parts) {
      if (part.type === "text" && part.text) {
        rows.push({
          役割: msg.role === "user" ? "ユーザー" : "AI",
          種別: "テキスト",
          内容: part.text as string,
        });
      }

      if (part.type?.toString().startsWith("tool-") && part.output) {
        const output = part.output as Record<string, unknown>;
        if (output.findings) {
          rows.push({
            役割: "AI",
            種別: "Gemini調査",
            内容: output.findings as string,
          });
        }
        const ingredients = output.ingredients as Array<Record<string, unknown>> | undefined;
        if (ingredients) {
          for (const ing of ingredients) {
            const regs = ing.regulations as Record<string, string> | undefined;
            rows.push({
              役割: "AI",
              種別: "安全性チェック",
              内容: `${ing.name} (${ing.inci || "-"})`,
              安全性: ing.safetyRating as string,
              説明: ing.description as string,
              推奨最大配合量: ing.maxConcentration as string,
              日本: regs?.japan || "",
              EU: regs?.eu || "",
              米国: regs?.us || "",
              中国: regs?.china || "",
              台湾: regs?.taiwan || "",
            });
          }
        }
      }
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "処方相談");
  XLSX.writeFile(wb, `${title}.xlsx`);
}

export function exportToCSV(
  title: string,
  messages: SavedMessage[]
): void {
  const text = messagesToText(messages);
  const bom = "\uFEFF";
  const blob = new Blob([bom + text], { type: "text/csv;charset=utf-8" });
  saveAs(blob, `${title}.txt`);
}
