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

const FALLBACK_MODELS = [
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

    const prompt = `You are a high-precision OCR and document typography engine.
Look at this tightly cropped image containing a text word, phrase, number, or field (such as from a certificate, form, receipt, or sign).

Read the exact text written in this cropped region with 100% precision.
Extract:
1. "text": The exact characters/numbers/words written in this image. Do not hallucinate or add surrounding text.
2. "fontFamily": Closest matching standard font:
   ['Inter', 'Montserrat', 'Oswald', 'Playfair Display', 'Cinzel', 'Courier Prime', 'Space Grotesk', 'Rubik', 'Caveat', 'Impact', 'Arial', 'Georgia', 'Times New Roman'].
3. "fontWeight": Font weight as string ('300', '400', '600', '700', '800', '900').
4. "fontStyle": 'normal' or 'italic'.
5. "color": Dominant hex color code of the printed text ink/letters (e.g. #111827, #1E293B, #000000).
6. "backgroundColor": Dominant hex color of the paper/surface directly behind the letters (e.g. #FFFFFF, #D6E4EE, #F1F5F9).
7. "hasOutline": boolean (usually false unless shadowed/outlined).
8. "outlineColor": hex color if stroke exists.
9. "blendMode": 'multiply' for documents/ink on paper, 'source-over' for opaque decals, 'screen' for illuminated text.
10. "cameraBlur": lens blur in px (0 to 3).
11. "filmGrain": grain level (0 to 25).
12. "letterSpacing": letter spacing in px (-2 to 8).`;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
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
                hasOutline: { type: Type.BOOLEAN },
                outlineColor: { type: Type.STRING },
                blendMode: { type: Type.STRING },
                cameraBlur: { type: Type.NUMBER },
                filmGrain: { type: Type.NUMBER },
                letterSpacing: { type: Type.NUMBER },
              },
              required: ["text", "fontFamily", "color", "backgroundColor"],
            },
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return NextResponse.json(parsed);
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} in read-region failed:`, err.message || err);
        if (err.status === 503 || err.status === 429) {
          await new Promise((res) => setTimeout(res, 500));
        }
      }
    }

    // Graceful fallback if models are busy:
    return NextResponse.json({
      fallback: true,
      text: "EDIT TEXT",
      fontFamily: "Inter",
      fontWeight: "700",
      fontStyle: "normal",
      color: "#1E293B",
      backgroundColor: "#E2E8F0",
      blendMode: "multiply",
      cameraBlur: 0.3,
      filmGrain: 8,
      letterSpacing: 1,
    });
  } catch (error: any) {
    console.error("Read region error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to read text in box" },
      { status: 500 }
    );
  }
}
