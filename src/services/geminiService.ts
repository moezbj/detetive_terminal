/* 
import { GoogleGenAI, Type, Modality } from "@google/genai";
import  type { SuspectID, Message, CrimeCase, CaseProgress, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

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
    - Found Clues: ${progress.discovered_clue_ids.join(', ')}
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
} */

import type {
  SuspectID,
  CrimeCase,
  CaseProgress,
  Language,
} from "../types";

// Local deterministic response templates
const responses: Record<string, Record<string, string[]>> = {
  en: {
    defensive: [
      "Why are you pressing me on this?",
      "I already told you what happened.",
      "Are you accusing me of something?",
      "I don't like your tone.",
      "Check again. You're wrong.",
    ],
    neutral: [
      "I was home that night.",
      "I don't know anything about that.",
      "You'll have to prove it.",
      "I barely knew them.",
      "That's not what happened.",
    ],
    nervous: [
      "*shifts uncomfortably*",
      "Look, it's complicated...",
      "I didn't mean for this to happen.",
      "You don't understand the whole story.",
      "I can explain...",
    ],
  },
  fr: {
    defensive: [
      "Pourquoi insistez-vous là-dessus?",
      "Je vous ai déjà dit ce qui s'est passé.",
      "Vous m'accusez de quelque chose?",
      "Je n'aime pas votre ton.",
      "Vérifiez encore. Vous avez tort.",
    ],
    neutral: [
      "J'étais chez moi cette nuit.",
      "Je ne sais rien de cela.",
      "Vous devrez le prouver.",
      "Je les connaissais à peine.",
      "Ce n'est pas ce qui s'est passé.",
    ],
    nervous: [
      "*gesticulle nerveusement*",
      "Écoutez, c'est compliqué...",
      "Je n'ai pas voulu que ça arrive.",
      "Vous ne comprenez pas toute l'histoire.",
      "Je peux expliquer...",
    ],
  },
  ar: {
    defensive: [
      "لماذا تضغط علي بهذا؟",
      "لقد أخبرتك ما حدث بالفعل.",
      "هل تتهمني بشيء؟",
      "لا يعجبني أسلوبك.",
      "تحقق مرة أخرى. أنت مخطئ.",
    ],
    neutral: [
      "كنت في المنزل تلك الليلة.",
      "لا أعرف شيئاً عن ذلك.",
      "سيتوجب عليك إثبات ذلك.",
      "بالكاد عرفتهم.",
      "هذا ليس ما حدث.",
    ],
    nervous: [
      "*يتململ بعدم ارتياح*",
      "انظر، الأمر معقد...",
      "لم أقصد حدوث هذا.",
      "أنت لا تفهم القصة كاملة.",
      "يمكنني التوضيح...",
    ],
  },
};

// Default fallback responses
const defaultResponses = {
  en: "I have nothing to say...",
  fr: "Je n'ai rien à dire...",
  ar: "ليس لدي ما أقوله...",
};

// Suspicious keywords that trigger defensive responses
const accusatoryKeywords: Record<string, string[]> = {
  en: [
    "kill",
    "murder",
    "liar",
    "lying",
    "proof",
    "evidence",
    "accuse",
    "guilty",
  ],
  fr: ["tuer", "meurtre", "menteur", "preuve", "accuser", "coupable"],
  ar: ["قتل", "جريمة", "كذاب", "دليل", "اتهام", "مذنب"],
};

export async function interrogateSuspect(
  currentCase: CrimeCase,
  suspectId: SuspectID,
  userPrompt: string,
  language: Language = "en",
): Promise<string> {
  const suspect = currentCase.suspects.find((s) => s.id === suspectId);
  if (!suspect) return defaultResponses[language];

  // Check if this is the killer being accused
  const isKiller = suspectId === currentCase.killerId;
  const isAccusatory =
    accusatoryKeywords[language]?.some((keyword) =>
      userPrompt.toLowerCase().includes(keyword.toLowerCase()),
    ) || false;

  // Check if user is correctly identifying the mechanism
  const mentionsMechanism = userPrompt
    .toLowerCase()
    .includes(currentCase.solutionSecret.toLowerCase());

  const confessionTriggered = isKiller && isAccusatory && mentionsMechanism;

  // Generate response based on context
  let response = "";

  if (confessionTriggered) {
    // Dramatic confession
    response =
      language === "ar"
        ? "نعم... أنا من فعل ذلك. ${currentCase.solutionSecret}"
        : language === "fr"
          ? "Oui... c'est moi. ${currentCase.solutionSecret}"
          : `Yes... it was me. ${currentCase.solutionSecret}`;
  } else if (isKiller && isAccusatory) {
    // Killer gets defensive when accused
    const responses_pool =
      responses[language]?.defensive || responses.en.defensive;
    response =
      responses_pool[Math.floor(Math.random() * responses_pool.length)];
  } else if (isKiller) {
    // Killer is nervous
    const responses_pool = responses[language]?.nervous || responses.en.nervous;
    response =
      responses_pool[Math.floor(Math.random() * responses_pool.length)];
  } else {
    // Innocent suspect
    const responses_pool = responses[language]?.neutral || responses.en.neutral;
    response =
      responses_pool[Math.floor(Math.random() * responses_pool.length)];
  }

  return response;
}

export async function generateHint(
  currentCase: CrimeCase,
  progress: CaseProgress,
  language: Language = "en",
): Promise<string> {
  const missingClues = currentCase.clues
    .map((c) => c.id)
    .filter((id) => !progress.discovered_clue_ids.includes(id));

  const missingSuspects = currentCase.suspects
    .map((s) => s.id)
    .filter((id) => !progress.interrogatedSuspectIds.includes(id));

  const hintTemplates: Record<string, string[]> = {
    en: [
      "Intel suggests you haven't examined {missing_clues} yet.",
      "Witnesses mention {missing_suspects} was acting suspiciously.",
      "The key lies in understanding the {solution_key}.",
      "Check your case files. Something about {missing_clues} doesn't add up.",
      "{missing_suspects} hasn't been properly questioned.",
      "The truth is hidden in the details of {solution_key}.",
    ],
    fr: [
      "Les renseignements suggèrent que vous n'avez pas encore examiné {missing_clues}.",
      "Des témoins mentionnent que {missing_suspects} agissait de façon suspecte.",
      "La clé réside dans la compréhension du {solution_key}.",
      "Vérifiez vos dossiers. Quelque chose à propos de {missing_clues} ne colle pas.",
      "{missing_suspects} n'a pas été correctement interrogé.",
      "La vérité est cachée dans les détails de {solution_key}.",
    ],
    ar: [
      "تشير المعلومات أنك لم تفحص {missing_clues} بعد.",
      "يشير الشهود أن {missing_suspects} كان يتصرف بشكل مريب.",
      "المفتاح يكمن في فهم {solution_key}.",
      "راجع ملفات قضيتك. هناك شيء غير متناسق بشأن {missing_clues}.",
      "{missing_suspects} لم يتم استجوابه بشكل صحيح.",
      "الحقيقة مخفية في تفاصيل {solution_key}.",
    ],
  };

  const templates = hintTemplates[language] || hintTemplates.en;
  let hint = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders with actual data
  hint = hint.replace(
    "{missing_clues}",
    missingClues.join(", ") || "unknown evidence",
  );
  hint = hint.replace(
    "{missing_suspects}",
    missingSuspects.join(", ") || "someone",
  );
  hint = hint.replace(
    "{solution_key}",
    currentCase.solutionSecret.split(" ").slice(0, 3).join(" "),
  );

  return hint;
}

export async function evaluateAccusation(
  currentCase: CrimeCase,
  accusedId: SuspectID,
  theory: string,
  language: Language = "en",
): Promise<{ correct: boolean; feedback: string }> {
  const isCorrectKiller = accusedId === currentCase.killerId;
  const mentionsMechanism = theory
    .toLowerCase()
    .includes(currentCase.solutionSecret.toLowerCase());
  const correct = isCorrectKiller && mentionsMechanism;
  console.log(
    "currentCase",
    currentCase,
    "accusedId",
    accusedId,
    "isCorrectKiller",
    isCorrectKiller,
    "mentionsMechanism",
    mentionsMechanism,
  );

  const feedbackTemplates: Record<
    string,
    { correct: string[]; incorrect: string[] }
  > = {
    en: {
      correct: [
        "The room goes silent. {accusedName} lowers their head. 'You're right... it was me. {solutionSecret}.'",
        "The evidence points directly at {accusedName}. They finally confess: '{solutionSecret}'.",
        "Case closed. {accusedName} breaks down and admits everything. '{solutionSecret}.'",
      ],
      incorrect: [
        "{accusedName} looks relieved. 'That's not what happened. Check your evidence again.'",
        "The alibi checks out. {accusedName} couldn't have done it.",
        "Forensics don't support your theory. Keep investigating.",
      ],
    },
    fr: {
      correct: [
        "Le silence emplit la pièce. {accusedName} baisse la tête. 'Vous avez raison... c'était moi. {solutionSecret}.'",
        "Les preuves pointent directement vers {accusedName}. Ils avouent enfin: '{solutionSecret}'.",
        "Affaire classée. {accusedName} craque et admet tout. '{solutionSecret}.'",
      ],
      incorrect: [
        "{accusedName} semble soulagé. 'Ce n'est pas ce qui s'est passé. Vérifiez vos preuves.'",
        "L'alibi tient la route. {accusedName} n'a pas pu le faire.",
        "La médecine légale ne soutient pas votre théorie. Continuez à enquêter.",
      ],
    },
    ar: {
      correct: [
        "يسود الصمت الغرفة. {accusedName} يخفض رأسه. 'أنت محق... لقد كنت أنا. {solutionSecret}.'",
        "الأدلة تشير مباشرة إلى {accusedName}. يعترف أخيراً: '{solutionSecret}'.",
        "القضية مغلقة. {accusedName} ينهار ويعترف بكل شيء. '{solutionSecret}.'",
      ],
      incorrect: [
        "{accusedName} يبدو مرتاحاً. 'هذا ليس ما حدث. تحقق من أدلتك مرة أخرى.'",
        "التحقق من الإثبات يثبت براءته. {accusedName} لم يستطع فعل ذلك.",
        "الأدلة الجنائية لا تدعم نظريتك. استمر في التحقيق.",
      ],
    },
  };

  const suspect = currentCase.suspects.find((s) => s.id === accusedId);
  const suspectName = suspect?.name || accusedId;
  let feedback = "";
  const templates = feedbackTemplates[language] || feedbackTemplates.en;

  if (correct) {
    feedback =
      templates.correct[Math.floor(Math.random() * templates.correct.length)];
    feedback = feedback.replace("{accusedName}", suspectName);
    feedback = feedback.replace("{solutionSecret}", currentCase.solutionSecret);
  } else {
    feedback =
      templates.incorrect[
        Math.floor(Math.random() * templates.incorrect.length)
      ];
    feedback = feedback.replace("{accusedName}", suspectName);
  }

  return { correct, feedback };
}
