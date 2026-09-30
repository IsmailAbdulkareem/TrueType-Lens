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
Identify ALL readable text elements that can be edited or replaced (titles, names, numbers, values, labels, dates, marks, headings, stamps, table cells).

CRITICAL RULES FOR DOCUMENTS, CERTIFICATES, MARKS SHEETS, AND FORMS:
1. DO NOT MISS ANY WORDS OR NUMBERS: Scan the image thoroughly from top to bottom, row by row. Include every field, name, number, score, date, and title.
2. DO NOT MERGE DISTINCT FIELDS: Keep labels and their values separated (e.g. 'NAME:' as one box, and the person's name as its own separate box; 'ROLL NUMBER:' and the number as separate boxes; 'DATE OF BIRTH:' and date as separate boxes).
3. TIGHT NON-OVERLAPPING BOUNDING BOXES: Each box [ymin, xmin, ymax, xmax] must tightly wrap the exact printed characters with NO overlap onto neighboring lines or columns.
   - ymin is the top edge (0-1000)
   - xmin is the left edge (0-1000)
   - ymax is the bottom edge (0-1000)
   - xmax is the right edge (0-1000)
4. For tables (marks sheets, receipts, grade tables): identify every cell value (numbers, grades, subject names).
5. Accurate baseline alignment: Bounding boxes must precisely match where the text is printed on the physical image.

For each text element detected, determine:
1. "text": The exact text currently written in the image.
2. "box_2d": The tight bounding box coordinates [ymin, xmin, ymax, xmax] normalized to a 0-1000 integer scale.
3. "fontFamily": The closest matching web font family from this list:
   ['Inter', 'Montserrat', 'Oswald', 'Playfair Display', 'Cinzel', 'Courier Prime', 'Space Grotesk', 'Rubik', 'Caveat', 'Impact', 'Arial', 'Georgia'].
4. "fontWeight": Font weight as a string ('300', '400', '600', '700', '800', '900').
5. "fontStyle": 'normal' or 'italic'.
6. "textAlign": 'left' for left-aligned body text and forms, 'center' for centered titles or numbers.
7. "color": Dominant hex color code of the text glyphs (e.g. #1E293B, #0F172A, #000000, #E63946). Match the exact ink/print color.
8. "outlineColor": Hex color if the text has an outline or stroke, else null.
9. "outlineWidth": Estimated outline width in pixels (0 if no outline).
10. "shadowColor": Hex color if there is a noticeable shadow, else null.
11. "shadowBlur": Drop shadow blur radius in px (0 if sharp/none).
12. "backgroundColor": Dominant hex color of the background/paper immediately behind/around the letters (used for seamless background inpainting patch).
13. "backgroundTexture": One of 'paper', 'solid', 'gradient', 'wood', 'chalkboard', 'fabric', 'concrete', 'photo'.
14. "rotationAngle": Rotation angle in degrees (clockwise positive, counter-clockwise negative, usually -5 to 5 for scanned documents).
15. "blendMode": Best blend mode: 'multiply' for documents/ink on paper, 'source-over' for opaque decals, 'screen' for neon signs.
16. "cameraBlur": Lens blur / edge softness in px (0.2 to 1.5 for scanned paper).
17. "filmGrain": Sensor noise / paper grain level (4 to 20).
18. "perspectiveSkewX": Approximate horizontal perspective slant (-30 to 30 degrees, 0 if flat).
19. "letterSpacing": Approximate letter spacing in pixels (-2 to 6).`;

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
                      textAlign: { type: Type.STRING },
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
