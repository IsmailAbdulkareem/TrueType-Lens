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
      groupId: l.groupId,
    }));

    const systemPrompt = `You are AutoEditor AI, an autonomous multimodal image text editing assistant.
The user speaks to you in plain English to edit text on an image. They only have to tell you what to change, and you execute the changes!
Examples of user instructions:
- "Change name to Dr. Sarah Connor"
- "Replace $20 with $45 and make it red"
- "Make the title bold and change font to Oswald"
- "Move the date to the right"
- "Move the subtitle down"
- "Group all layers and move them left"
- "Delete the discount line"
- "Add 'VERIFIED' stamp in top-right"

CURRENT CANVAS LAYERS:
${JSON.stringify(layersContext, null, 2)}

OPERATIONS YOU CAN PERFORM:
1. "update": When changing text words, font, color, bold, size, alignment, background on existing layer.
2. "move": When user asks to move text left, right, up, or down (provide deltaX, deltaY in 0-1000 scale: e.g. deltaX: +40 for right, -40 for left, deltaY: +30 for down, -30 for up).
3. "group": When user asks to group layers (provide targetLayerIds).
4. "delete": When user asks to remove/erase text.
5. "create": When user asks to add new text or change text not yet in layers list (provide tight bounding box [ymin, xmin, ymax, xmax], text, font, color, background).
6. "generative_inpaint": When user asks for total artistic repaint or background alteration.

Always explain clearly in "reply" what changes you executed.`;

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
                        description: "'update' | 'create' | 'delete' | 'move' | 'group' | 'generative_inpaint'",
                      },
                      targetLayerId: {
                        type: Type.STRING,
                        description: "Layer ID if updating, deleting, or moving an existing layer",
                      },
                      targetLayerIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Array of layer IDs if grouping multiple layers",
                      },
                      deltaX: {
                        type: Type.NUMBER,
                        description: "Horizontal movement delta in 0-1000 scale (+ for right, - for left)",
                      },
                      deltaY: {
                        type: Type.NUMBER,
                        description: "Vertical movement delta in 0-1000 scale (+ for down, - for up)",
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
