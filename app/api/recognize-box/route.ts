import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const MODELS_TO_TRY = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

export async function POST(req: NextRequest) {
  try {
    const { croppedBase64, mimeType = "image/jpeg" } = await req.json();

    if (!croppedBase64) {
      return NextResponse.json(
        { error: "Cropped image base64 data is required" },
        { status: 400 }
      );
    }

    const cleanBase64 = croppedBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const prompt = `Analyze this cropped image region for an exact text editing and inpainting tool.
Carefully read the exact words and typographic styling inside this cropped box.

Extract:
1. "text": The exact text/numbers printed in this snippet (preserve capitalization and punctuation).
2. "fontFamily": Closest matching font from: ['Inter', 'Montserrat', 'Oswald', 'Playfair Display', 'Cinzel', 'Courier Prime', 'Space Grotesk', 'Rubik', 'Caveat', 'Impact', 'Arial', 'Georgia'].
3. "fontWeight": ('300', '400', '600', '700', '800', '900').
4. "fontStyle": 'normal' or 'italic'.
5. "color": Hex color code of the text ink/glyphs (e.g. #0F172A, #000000, #FFFFFF, etc.).
6. "backgroundColor": Hex color code of the paper/background behind this text.
7. "textAlign": 'left' for standard text, 'center' for centered titles.
8. "hasOutline": boolean.
9. "outlineColor": Hex color if outlined or null.
10. "outlineWidth": number in px (0 if none).
11. "hasShadow": boolean.
12. "shadowColor": Hex color or null.
13. "cameraBlur": Softness in px (0.2 to 1.5).
14. "filmGrain": Noise level (4 to 20).
15. "letterSpacing": Spacing in px (-2 to 4).`;

    for (const model of MODELS_TO_TRY) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              { text: prompt },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                fontFamily: { type: Type.STRING },
                fontWeight: { type: Type.STRING },
                fontStyle: { type: Type.STRING },
                color: { type: Type.STRING },
                backgroundColor: { type: Type.STRING },
                textAlign: { type: Type.STRING },
                hasOutline: { type: Type.BOOLEAN },
                outlineColor: { type: Type.STRING },
                outlineWidth: { type: Type.NUMBER },
                hasShadow: { type: Type.BOOLEAN },
                shadowColor: { type: Type.STRING },
                cameraBlur: { type: Type.NUMBER },
                filmGrain: { type: Type.NUMBER },
                letterSpacing: { type: Type.NUMBER },
              },
              required: ["text", "fontFamily", "color", "backgroundColor"],
            },
          },
        });

        const responseText = response.text;
        if (responseText) {
          const parsed = JSON.parse(responseText);
          return NextResponse.json({ success: true, ...parsed });
        }
      } catch (err: any) {
        console.warn(`Recognize-box model ${model} error:`, err?.message || err);
        // Wait 400ms before fallback
        if (err?.status === 503 || err?.status === 429) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    // Graceful fallback if AI is experiencing 503 high demand
    return NextResponse.json({
      success: false,
      fallback: true,
      text: "EDIT THIS TEXT",
      fontFamily: "Montserrat",
      fontWeight: "700",
      fontStyle: "normal",
      color: "#0F172A",
      backgroundColor: "#F8FAFC",
      textAlign: "left",
      hasOutline: false,
      outlineColor: "#000000",
      outlineWidth: 0,
      hasShadow: false,
      shadowColor: "transparent",
      cameraBlur: 0.4,
      filmGrain: 8,
      letterSpacing: 1,
    });
  } catch (error: any) {
    console.error("Recognize-box route error:", error);
    return NextResponse.json({
      success: false,
      fallback: true,
      text: "EDIT THIS TEXT",
      fontFamily: "Inter",
      color: "#000000",
      backgroundColor: "#FFFFFF",
    });
  }
}
