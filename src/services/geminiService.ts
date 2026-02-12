
import { GoogleGenAI, Type, Modality } from "@google/genai";
import  type { SuspectID, Message, CrimeCase, CaseProgress, Language } from "../../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function interrogateSuspect(
  currentCase: CrimeCase,
  suspectId: SuspectID,
  history: Message[],
  userPrompt: string,
  language: Language = 'en'
): Promise<string> {
  const model = 'gemini-3-flash-preview';
  const suspect = currentCase.suspects.find(s => s.id === suspectId);
  
  const systemInstruction = `
    You are ${suspect?.name}, a suspect in the following crime.
    Respond exclusively in ${language === 'ar' ? 'Arabic' : language === 'fr' ? 'French' : 'English'}.
    
    Case: ${currentCase.title}
    Role: ${suspect?.role}
    Background: ${suspect?.description}
    Motive: ${suspect?.motive}
    Alibi: ${suspect?.alibi}
    
    CRIME CONTEXT:
    ${currentCase.description}
    
    GUIDELINES:
    1. Stay in character at all times.
    2. This is a real-time conversation. Use the provided history to remember context.
    3. If the user catches you in a lie, become defensive.
    4. Do NOT confess unless the detective correctly identifies the Killer (${currentCase.killerId}) and explains the mechanism: ${currentCase.solutionSecret}.
    5. Keep responses concise, atmospheric, and suspicious.
  `;

  const formattedHistory = history.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.text }]
  }));

  const chat = ai.chats.create({
    model,
    config: { systemInstruction },
    history: formattedHistory
  });

  const response = await chat.sendMessage({ message: userPrompt });
  return response.text || (language === 'ar' ? "ليس لدي ما أقوله..." : language === 'fr' ? "Je n'ai rien à dire..." : "I have nothing to say...");
}

export async function generateSpeech(text: string, language: Language = 'en'): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say with a noir, serious tone: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: language === 'fr' ? 'Kore' : 'Puck' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
}

export async function generateHint(
  currentCase: CrimeCase,
  progress: CaseProgress,
  language: Language = 'en'
): Promise<string> {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    The user is playing a detective game.
    Provide a cryptic hint in ${language === 'ar' ? 'Arabic' : language === 'fr' ? 'French' : 'English'}.
    Case: ${currentCase.title}
    Killer: ${currentCase.killerId}
    Solution: ${currentCase.solutionSecret}
    
    Progress so far:
    - Found Clues: ${progress.discoveredClueIds.join(', ')}
    - Interrogated Suspects: ${progress.interrogatedSuspectIds.join(', ')}
    
    Based on what is MISSING, provide a CRYPTIC hint. Do NOT give away the answer directly.
    Keep it short and in a noir "Intel Report" style.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || "Intel fragmented.";
}

export async function evaluateAccusation(
  currentCase: CrimeCase,
  accusedId: SuspectID,
  theory: string,
  language: Language = 'en'
): Promise<{ correct: boolean; feedback: string }> {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `
    Case: ${currentCase.title}
    Killer: ${currentCase.killerId}
    The Secret Truth: ${currentCase.solutionSecret}
    
    The user has accused: ${accusedId}
    The user's theory: ${theory}
    
    Is the user correct? (Must name the right killer AND roughly explain the mechanism).
    Respond in ${language === 'ar' ? 'Arabic' : language === 'fr' ? 'French' : 'English'}.
    If correct, provide a cinematic reveal. If wrong, explain why.
    
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
          feedback: { type: Type.STRING }
        },
        required: ["correct", "feedback"]
      }
    }
  });

  try {
    return JSON.parse(response.text?.trim() || "");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return { correct: false, feedback: "Error processing verdict." };
  }
}
