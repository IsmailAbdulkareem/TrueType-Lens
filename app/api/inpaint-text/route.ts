import { GoogleGenAI } from "@google/genai";
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

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, originalText, newText, instructions, mimeType = "image/jpeg" } = await req.json();

    if (!imageBase64 || !newText) {
      return NextResponse.json(
        { error: "Image base64 and new text are required" },
        { status: 400 }
      );
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const prompt = `Modify the text in this image:
Change the original text "${originalText || 'text'}" to say "${newText}".
CRITICAL PHOTOREALISM REQUIREMENTS:
1. Preserve the exact same typography, font style, weight, letter-spacing, and casing.
2. Match the exact same color, lighting, shadows, reflections, and ambient illumination.
3. Match the exact same background texture (grain, noise, scratches, fabric weave, paper grain, chalkboard chalk dust, or surface).
4. The text replacement must look 100% natural and authentic, as if it was originally photographed that way without digital editing artifacts.
${instructions ? `Additional note: ${instructions}` : ""}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let resultImageUrl: string | null = null;
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        resultImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!resultImageUrl) {
      return NextResponse.json(
        {
          error: "Model did not return an image. Falling back to the client-side pixel-perfect inpainter.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: resultImageUrl,
    });
  } catch (error: any) {
    console.error("Generative inpaint error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate AI inpaint",
        code: error.status || 500,
      },
      { status: 500 }
    );
  }
}
