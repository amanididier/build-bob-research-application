export interface ParsedKezaResponse {
  voice_response: string;
  summary: string;
  points: string[];
  table: { headers: string[]; rows: string[][] } | null;
  action: string | null;
  followups: string[];
  thinking: string | null;
  new_facts_about_user: string[];
  rawText: string;
}

export function parseKezaResponse(rawOutput: string): ParsedKezaResponse {
  const trimmed = rawOutput.trim();

  // Try extracting JSON block
  let jsonString = trimmed;
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  } else {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = trimmed.substring(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonString);
    return {
      voice_response: parsed.voice_response || parsed.summary || trimmed.slice(0, 150),
      summary: parsed.summary || parsed.voice_response || '',
      points: Array.isArray(parsed.points) ? parsed.points : [],
      table: parsed.table && typeof parsed.table === 'object' ? parsed.table : null,
      action: parsed.action || null,
      followups: Array.isArray(parsed.followups) ? parsed.followups : [],
      thinking: parsed.thinking || null,
      new_facts_about_user: Array.isArray(parsed.new_facts_about_user)
        ? parsed.new_facts_about_user
        : [],
      rawText: trimmed,
    };
  } catch {
    // Graceful fallback for non-JSON conversational output
    return {
      voice_response: trimmed.slice(0, 140),
      summary: trimmed.slice(0, 200),
      points: [],
      table: null,
      action: null,
      followups: [],
      thinking: null,
      new_facts_about_user: [],
      rawText: trimmed,
    };
  }
}
