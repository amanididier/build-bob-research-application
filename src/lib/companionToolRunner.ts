import { COMPANION_TOOL_DECLARATIONS, executeCompanionTool } from './companionTools';

type ToolCall = { name: string; args?: unknown };

function getFunctionCalls(response: any): ToolCall[] {
  if (Array.isArray(response?.functionCalls)) return response.functionCalls.filter((call: any) => typeof call?.name === 'string');
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];
  return parts.filter((part: any) => part?.functionCall?.name).map((part: any) => ({
    name: part.functionCall.name,
    args: part.functionCall.args || {},
  }));
}

function modelTurnContent(response: any, calls: ToolCall[]) {
  const candidateContent = response?.candidates?.[0]?.content;
  if (candidateContent) return candidateContent;
  return {
    role: 'model',
    parts: calls.map((call) => ({ functionCall: { name: call.name, args: call.args || {} } })),
  };
}

/**
 * Runs a bounded Gemini function-calling loop. Only the allowlisted tools in
 * companionTools.ts can execute; tool results are sent back to Gemini before
 * a user-facing confirmation is produced.
 */
export async function generateCompanionResponse(options: {
  ai: any;
  model: string;
  contents: any;
  systemInstruction: string;
  maxOutputTokens?: number;
}): Promise<{ text: string; toolCallsMade: string[] }> {
  const { ai, model, systemInstruction } = options;
  const maxOutputTokens = options.maxOutputTokens ?? 500;
  const contents: any[] = Array.isArray(options.contents)
    ? [...options.contents]
    : [{ role: 'user', parts: [{ text: String(options.contents ?? '') }] }];
  const toolCallsMade: string[] = [];

  let response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      maxOutputTokens,
      tools: [{ functionDeclarations: COMPANION_TOOL_DECLARATIONS }],
    },
  });

  // A small cap prevents loops and runaway API usage if a model repeatedly calls tools.
  for (let round = 0; round < 4; round++) {
    const calls = getFunctionCalls(response);
    if (!calls.length) return { text: String(response?.text || '').trim(), toolCallsMade };

    contents.push(modelTurnContent(response, calls));
    const functionResponses = [];
    for (const call of calls.slice(0, 5)) {
      let result: Record<string, unknown>;
      try {
        result = await executeCompanionTool(call.name, call.args);
      } catch (error) {
        result = { ok: false, error: error instanceof Error ? error.message : 'The tool failed unexpectedly.' };
      }
      toolCallsMade.push(call.name);
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: result,
        },
      });
    }
    contents.push({ role: 'user', parts: functionResponses });
    response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction + '\nTool-use rules: Report only actions confirmed by tool results. If a tool fails, say so plainly. Do not claim a roadmap is saved when the builder only opened.',
        maxOutputTokens,
        tools: [{ functionDeclarations: COMPANION_TOOL_DECLARATIONS }],
      },
    });
  }

  const finalText = String(response?.text || '').trim();
  return {
    text: finalText || 'I completed the available actions, but I could not finish the response cleanly. Please check the workspace before retrying.',
    toolCallsMade,
  };
}
