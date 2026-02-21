// /Users/jeffreyrutkowski/CRM Talent/talent-crm/src/app/api/parse-brief/route.ts
//
// POST /api/parse-brief
// Accepts { raw_text: string, mode?: 'ai' | 'rules' }
// Returns the parsed brief as JSON.

import { NextResponse } from "next/server";
import { parseBrief } from "@/lib/engine/brief-parser";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { raw_text, mode } = body as {
      raw_text?: string;
      mode?: "ai" | "rules";
    };

    if (!raw_text || typeof raw_text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'raw_text' field. Must be a non-empty string." },
        { status: 400 }
      );
    }

    if (raw_text.trim().length === 0) {
      return NextResponse.json(
        { error: "'raw_text' must not be empty or whitespace-only." },
        { status: 400 }
      );
    }

    const validModes = ["ai", "rules"] as const;
    const selectedMode: "ai" | "rules" =
      mode && validModes.includes(mode) ? mode : "rules";

    const parsed = await parseBrief(raw_text, { useAI: selectedMode === "ai" });

    return NextResponse.json({
      success: true,
      mode: selectedMode,
      data: parsed,
    });
  } catch (err) {
    console.error("[/api/parse-brief] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while parsing brief." },
      { status: 500 }
    );
  }
}
