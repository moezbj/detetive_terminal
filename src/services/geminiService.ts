import { GoogleGenAI, Type } from "@google/genai";
import type { SuspectID, Message, CrimeCase, CaseProgress } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function interrogateSuspect(
  currentCase: CrimeCase,
  suspectId: SuspectID,
  history: Message[],
  userPrompt: string,
): Promise<string> {
  const model = "gemini-3-flash-preview";
  const suspect = currentCase.suspects.find((s) => s.id === suspectId);

  const systemInstruction = `
    You are ${suspect?.name}, a suspect in the following crime:
    Case: ${currentCase.title}
    Role: ${suspect?.role}
    Background: ${suspect?.description}
    Motive: ${suspect?.motive}
    Alibi: ${suspect?.alibi}
    
    CRIME CONTEXT:
    ${currentCase.description}
    
    GUIDELINES:
    1. Stay in character at all times.
    2. This is a real-time conversation. Use the provided history to remember what the detective (user) has asked before.
    3. If the user catches you in a lie based on the Case File or Evidence, become more nervous or defensive.
    4. Do NOT confess unless the detective (user) correctly identifies the Killer (${currentCase.killerId}) and explains the secret mechanism: ${currentCase.solutionSecret}.
    5. Keep responses concise, atmospheric, and suspicious.
  `;

  const formattedHistory = history.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.text }],
  }));

  const chat = ai.chats.create({
    model,
    config: { systemInstruction },
    history: formattedHistory,
  });

  const response = await chat.sendMessage({ message: userPrompt });
  return response.text || "I... I have nothing to say to that.";
}

export async function generateHint(
  currentCase: CrimeCase,
  progress: CaseProgress,
): Promise<string> {
  const model = "gemini-3-flash-preview";

  const prompt = `
    The user is playing a detective game.
    Case: ${currentCase.title}
    Killer: ${currentCase.killerId}
    Solution: ${currentCase.solutionSecret}
    
    Progress so far:
    - Found Clues: ${progress.discoveredClueIds.join(", ")}
    - Interrogated Suspects: ${progress.interrogatedSuspectIds.join(", ")}
    
    Based on what is MISSING from their progress, provide a CRYPTIC hint to guide them. 
    Do NOT give away the answer directly. Suggest a specific clue to look for or a suspect to question further.
    Keep it short and in a noir "Intel Report" style.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || "Look closer at the shadows, detective.";
}

export async function evaluateAccusation(
  currentCase: CrimeCase,
  accusedId: SuspectID,
  theory: string,
): Promise<{ correct: boolean; feedback: string }> {
  const model = "gemini-3-pro-preview";

  const prompt = `
    Case: ${currentCase.title}
    Killer: ${currentCase.killerId}
    The Secret Truth: ${currentCase.solutionSecret}
    
    The user has accused: ${accusedId}
    The user's theory: ${theory}
    
    Is the user correct? To be correct, they must name the right killer AND roughly explain the method (${currentCase.solutionSecret}).
    If correct, provide a cinematic reveal of how they were caught.
    If wrong, explain why the evidence doesn't fit or how the real killer escaped.
    
    Respond in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correct: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING },
        },
        required: ["correct", "feedback"],
      },
    },
  });

  try {
    return JSON.parse(response.text?.trim() || "{}");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log("error", e);
    return {
      correct: false,
      feedback: "The records are missing. Please try again.",
    };
  }
}
