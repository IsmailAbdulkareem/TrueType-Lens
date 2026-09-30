import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      layers = [],
      imageBase64,
      history = [],
    } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const cleanBase64 = imageBase64
      ? imageBase64.replace(/^data:image\/[a-z]+;base64,/, "")
      : null;

    // Summarize existing layers for prompt context
    const layersContext = layers.map((l: any, idx: number) => ({
      id: l.id,
      index: idx,
      originalText: l.originalText || l.currentText,
      currentText: l.currentText,
      box: l.box,
      fontFamily: l.fontFamily,
      color: l.color,
      textAlign: l.textAlign,
      fontWeight: l.fontWeight,
    }));

    const systemPrompt = `You are AutoEditor AI, an autonomous multimodal image text editing assistant.
The user speaks to you in plain English to edit text on an image (e.g. "change the name to Alex", "replace $20 with $45", "make the title red and bold", "change all marks to 100", "remove the date", "add APPROVED stamp").

CURRENT CANVAS LAYERS:
${JSON.stringify(layersContext, null, 2)}

YOUR MISSION:
Interpret the user's intent and execute precise edits:
1. "update": If the target text matches an existing layer in CURRENT CANVAS LAYERS, update its 'currentText', 'color', 'fontFamily', 'fontWeight', 'fontSize', 'textAlign', 'backgroundColor', etc.
2. "create": If the user wants to change or add text that is NOT in the current layers list (or visible on the provided image), locate its physical position on the image, output tight bounding box [ymin, xmin, ymax, xmax] (0-1000 scale), background color, text color, and font style so it seamlessly heals the original text and puts the new text in place!
3. "delete": If the user wants to remove text, specify the target layer id to remove.
4. "generative_inpaint": If the user asks for visual neural transformation of the whole image (e.g., "repaint as vintage parchment", "add a golden seal", "change background to black marble"), provide a generative inpaint prompt.

CRITICAL TYPOGRAPHIC REALISM:
- When changing text values, retain authentic colors, ink shades, and matching font families.
- Left-align standard form/document text ('left'), center titles ('center').
- Keep explanations clear and helpful.`;

    const parts: any[] = [];
    if (cleanBase64) {
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg",
        },
      });
    }
    parts.push({
      text: `${systemPrompt}\n\nUser request: "${message}"\n\nExecute the requested edits now.`,
    });

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts,
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: "Helpful, conversational explanation of the exact edits made to the image.",
                },
                operations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description: "'update' | 'create' | 'delete' | 'generative_inpaint'",
                      },
                      targetLayerId: {
                        type: Type.STRING,
                        description: "Layer ID if updating or deleting an existing layer",
                      },
                      updates: {
                        type: Type.OBJECT,
                        properties: {
                          currentText: { type: Type.STRING },
                          color: { type: Type.STRING },
                          fontFamily: { type: Type.STRING },
                          fontWeight: { type: Type.STRING },
                          fontStyle: { type: Type.STRING },
                          textAlign: { type: Type.STRING },
                          fontSize: { type: Type.NUMBER },
                          letterSpacing: { type: Type.NUMBER },
                          backgroundColor: { type: Type.STRING },
                          inpaintOriginal: { type: Type.BOOLEAN },
                          hasOutline: { type: Type.BOOLEAN },
                          outlineColor: { type: Type.STRING },
                          outlineWidth: { type: Type.NUMBER },
                        },
                      },
                      newLayer: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          box_2d: {
                            type: Type.ARRAY,
                            items: { type: Type.INTEGER },
                            description: "[ymin, xmin, ymax, xmax] 0-1000 scale",
                          },
                          fontFamily: { type: Type.STRING },
                          fontWeight: { type: Type.STRING },
                          fontStyle: { type: Type.STRING },
                          color: { type: Type.STRING },
                          backgroundColor: { type: Type.STRING },
                          textAlign: { type: Type.STRING },
                        },
                      },
                      generativePrompt: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ["type"],
                  },
                },
                quickSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "2-3 short follow-up prompts the user might want next",
                },
              },
              required: ["reply", "operations"],
            },
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return NextResponse.json({ success: true, ...parsed });
        }
      } catch (err: any) {
        console.warn(`Chat-edit model ${model} failed:`, err?.message || err);
        if (err?.status === 503 || err?.status === 429) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    // Heuristic client fallback if model is unavailable
    const lower = message.toLowerCase();
    let fallbackReply = `I understood your request: "${message}".`;
    const fallbackOperations: any[] = [];

    // Check if user wants to change text
    const matchedLayer = layers.find((l: any) =>
      lower.includes(l.currentText.toLowerCase()) || lower.includes(l.originalText?.toLowerCase() || '')
    );

    if (matchedLayer) {
      fallbackOperations.push({
        type: 'update',
        targetLayerId: matchedLayer.id,
        updates: {
          currentText: message.replace(/change|to|make|replace|the|text/gi, '').trim(),
        },
        description: `Updated text for layer "${matchedLayer.currentText}"`,
      });
      fallbackReply = `Updated "${matchedLayer.currentText}" on the image for you!`;
    }

    return NextResponse.json({
      success: true,
      fallback: true,
      reply: fallbackReply,
      operations: fallbackOperations,
      quickSuggestions: [
        "Change text color to golden",
        "Make text bold",
        "Select with Lens tool",
      ],
    });
  } catch (error: any) {
    console.error("Chat edit error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process chat edit command" },
      { status: 500 }
    );
  }
}
