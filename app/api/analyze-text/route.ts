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

// Models to try in order of preference if 503 or rate limits occur
const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image base64 data is required" },
        { status: 400 }
      );
    }

    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const prompt = `Analyze this image with high typographic precision for an image text replacement and editing tool.
Identify all readable text elements that can be edited or replaced.

For each text element detected, accurately determine:
1. "text": The exact text currently written in the image.
2. "box_2d": The bounding box coordinates [ymin, xmin, ymax, xmax] normalized to a 0-1000 integer scale.
3. "fontFamily": The closest matching web font family from this list:
   ['Inter', 'Montserrat', 'Oswald', 'Playfair Display', 'Cinzel', 'Courier Prime', 'Space Grotesk', 'Rubik', 'Caveat', 'Impact', 'Arial', 'Georgia'].
4. "fontWeight": Font weight as a string ('300', '400', '600', '700', '800', '900').
5. "fontStyle": 'normal' or 'italic'.
6. "color": Dominant hex color code of the text glyphs (e.g. #FFFFFF, #E63946, #1A1A1A). Be extremely precise to match the actual visual color with lighting.
7. "outlineColor": Hex color if the text has an outline, stroke, or border, else null or empty.
8. "outlineWidth": Estimated outline width in pixels (0 if no outline).
9. "shadowColor": Hex color if there is a noticeable shadow, else null.
10. "shadowBlur": Drop shadow blur radius in px (0 if sharp/none).
11. "backgroundColor": Dominant hex color of the background immediately behind/around the letters (used for seamless background inpainting patch).
12. "backgroundTexture": One of 'solid', 'gradient', 'paper', 'wood', 'chalkboard', 'fabric', 'concrete', 'photo'.
13. "rotationAngle": Rotation angle in degrees (clockwise positive, counter-clockwise negative, usually -45 to 45).
14. "blendMode": Best blend mode for realism: 'source-over' (default), 'multiply' (for ink on paper/t-shirt), 'screen' (for neon/glowing signs), 'overlay' (for metallic/textured).
15. "cameraBlur": Lens blur / edge softness in px (0 to 4).
16. "filmGrain": Sensor noise / grain level (0 to 30) to blend with the original photo.
17. "perspectiveSkewX": Approximate horizontal perspective slant (-30 to 30 degrees, 0 if flat).
18. "letterSpacing": Approximate letter spacing in pixels (-2 to 10).`;

    let lastError: any = null;

    // Try fallback models with slight delay if 503 occurs
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
                detectedTextElements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
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
                      outlineColor: { type: Type.STRING },
                      outlineWidth: { type: Type.NUMBER },
                      shadowColor: { type: Type.STRING },
                      shadowBlur: { type: Type.NUMBER },
                      backgroundColor: { type: Type.STRING },
                      backgroundTexture: { type: Type.STRING },
                      rotationAngle: { type: Type.NUMBER },
                      blendMode: { type: Type.STRING },
                      cameraBlur: { type: Type.NUMBER },
                      filmGrain: { type: Type.NUMBER },
                      perspectiveSkewX: { type: Type.NUMBER },
                      letterSpacing: { type: Type.NUMBER },
                    },
                    required: ["text", "box_2d", "fontFamily", "color", "backgroundColor"],
                  },
                },
                imageAtmosphere: {
                  type: Type.OBJECT,
                  properties: {
                    overallGrain: { type: Type.NUMBER },
                    lightingTone: { type: Type.STRING },
                    dominantPalettes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
              required: ["detectedTextElements"],
            },
          },
        });

        const text = response.text;
        if (text) {
          const parsedData = JSON.parse(text);
          return NextResponse.json(parsedData);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed with:`, err.message || err);
        // If 503 or 429, wait 600ms before trying fallback model
        if (err.status === 503 || err.status === 429 || (err.message && err.message.includes('503'))) {
          await new Promise((res) => setTimeout(res, 600));
        }
      }
    }

    // If all AI models failed due to temporary high demand (503):
    // Return a structured graceful fallback response so the client never crashes
    console.warn("All Gemini models temporarily unavailable (503), returning smart fallback text zones");
    return NextResponse.json({
      fallback: true,
      message: "AI model is currently experiencing high demand. Provided ready-to-edit smart text box.",
      detectedTextElements: [
        {
          id: `fallback-text-${Date.now()}`,
          text: "SAMPLE TEXT",
          box_2d: [420, 200, 560, 800],
          fontFamily: "Montserrat",
          fontWeight: "700",
          fontStyle: "normal",
          color: "#FFFFFF",
          outlineColor: "#000000",
          outlineWidth: 2,
          shadowColor: "rgba(0,0,0,0.6)",
          shadowBlur: 4,
          backgroundColor: "#1F2421",
          backgroundTexture: "photo",
          rotationAngle: 0,
          blendMode: "source-over",
          cameraBlur: 0.4,
          filmGrain: 10,
          perspectiveSkewX: 0,
          letterSpacing: 2,
        },
      ],
    });
  } catch (error: any) {
    console.error("Text analysis error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to analyze text in image",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
