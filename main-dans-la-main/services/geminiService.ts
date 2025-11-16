import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AITranslation, AnnoyanceDepthAnalysis, DeepIntrospectionAnalysis, ActionPlan } from '../types';

const URGENT_KEYWORDS = ['rompre', 'addiction', 'casser', 'quitter', 'malade', 'drogue'];

const handleApiError = (error: unknown): { error: string } => {
    console.error("Gemini API Error:", error);
    if (error instanceof Error && error.message.includes('Requested entity was not found')) {
        return { error: "API_KEY_INVALID" };
    }
    return { error: "Désolé, une erreur de communication avec l'IA est survenue. Veuillez réessayer." };
}

export const analyzeAnnoyanceDepth = async (annoyance: string): Promise<AnnoyanceDepthAnalysis | { error: string }> => {
  if (!annoyance.trim()) {
    return { depth_score: 0, feedback: "Commencez par décrire la situation factuellement.", completed_points: [] };
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `
    You are an AI assistant specialized in Non-Violent Communication (NVC), guiding a user to deeply express a frustration with their partner.
    Your goal is to evaluate the user's text against an 8-point introspection checklist and provide precise, step-by-step guidance.
    The analysis must be strict. Each point must be clearly and explicitly addressed in the text to be considered complete.

    The 8 points of introspection are (with their keys):
    1.  **situation**: A neutral, factual description of what happened. (e.g., "When I saw the clothes on the floor...")
    2.  **sensation**: The physical sensation in the body. (e.g., "...my stomach tightened...")
    3.  **emotion**: An explicit "I-statement" about the primary emotion. (e.g., "...I felt a wave of sadness...")
    4.  **thoughts**: The automatic thoughts or judgments that arose. (e.g., "...my first thought was 'he doesn't care'...")
    5.  **story**: The broader interpretation or narrative created. (e.g., "...and the story I told myself is that I'm alone in this...")
    6.  **echo**: A connection to a past experience, often from childhood. (e.g., "...this reminds me of how I had to take care of everything as a child...")
    7.  **need**: The underlying universal human need that was unmet. (e.g., "...I think my need for partnership and support wasn't met.")
    8.  **responsibility**: A reflection on one's own power or a different possible response. (e.g., "Looking back, I could have taken a breath instead of reacting immediately.")

    Your task:
    1.  Read the user's text.
    2.  Identify which of the 8 points are explicitly covered. Create a list of their keys in 'completed_points'.
    3.  Calculate 'depth_score' as (number of completed points / 8) * 100. Round to the nearest integer.
    4.  Determine the FIRST point in the list that is MISSING.
    5.  Create a 'feedback' message in French that specifically and encouragingly asks the user to add that missing point. The feedback must be very short and direct.

    Examples:
    - Input: "Il a encore laissé traîner ses affaires."
      - Response: { "depth_score": 13, "completed_points": ["situation"], "feedback": "C'est noté pour la situation. Quelle a été votre sensation physique à ce moment précis ?" }
    - Input: "Hier soir, en voyant son sac au milieu du salon, j'ai eu une boule au ventre et je me suis sentie découragée."
      - Response: { "depth_score": 38, "completed_points": ["situation", "sensation", "emotion"], "feedback": "Très bien. Quelles sont les pensées ou les jugements qui vous sont venus à l'esprit ?" }
    - Input: "..." (contains all 8 points)
      - Response: { "depth_score": 100, "completed_points": ["situation", "sensation", "emotion", "thoughts", "story", "echo", "need", "responsibility"], "feedback": "Analyse très complète et profonde. Vous pouvez passer à l'étape suivante." }

    Your output MUST be a single JSON object with 'depth_score', 'feedback', and 'completed_points'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this text for depth: "${annoyance}"`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            depth_score: { type: Type.INTEGER, description: "Score from 0 to 100." },
            feedback: { type: Type.STRING, description: "A short, encouraging, and specific guiding sentence in French." },
            completed_points: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "An array of keys for the completed introspection points."
            }
          },
          required: ["depth_score", "feedback", "completed_points"]
        },
      },
    });

    const parsedResponse = JSON.parse(response.text.trim());
    return parsedResponse as AnnoyanceDepthAnalysis;
  } catch (error) {
    const apiError = handleApiError(error);
    if (apiError.error === 'API_KEY_INVALID') return apiError;

    // Fallback for depth analysis is less critical, can return a default state
    return { depth_score: 0, feedback: "Analyse en pause. Continuez à écrire...", completed_points: [] };
  }
};


export const generateDeepIntrospection = async (annoyance: string, author: string, partner: string): Promise<DeepIntrospectionAnalysis | { error: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `
    You are an AI couples therapist, deeply pedagogical, empathetic, and wise. Your analysis must be **at least 5 times longer, richer, and more detailed** than a simple summary.
    Your task is to analyze a user's detailed annoyance (which includes a childhood echo) and provide a deep, multi-faceted, and **highly educational** introspection. The output must be in French.
    The user is ${author}, their partner is ${partner}.

    You must generate a JSON object with six main keys: "story", "underlyingEmotion", "unmetNeed", "mentalMechanism", "childhoodEcho", and "personalPower".

    1.  **story**:
        -   title: "L'histoire que vous vous racontez"
        -   content: **(Detailed)** Rephrase the user's perception as the "story they are telling themselves". Unpack the assumptions, the perceived injustices, and the narrative thread.
        -   explanation: **(Pedagogical & Personalized)** Write a detailed, educational paragraph explaining WHY identifying this "story" is crucial, personalizing it by directly referencing ${author}'s specific situation.

    2.  **underlyingEmotion**:
        -   title: "L'émotion racine"
        -   content: **(Detailed)** Identify the primary, more vulnerable emotion hidden beneath the surface frustration (e.g., fear, sadness, loneliness).
        -   explanation: **(Pedagogical & Personalized)** Explain the "iceberg" concept of emotions, linking it to the emotion you identified for ${author}.

    3.  **unmetNeed**:
        -   title: "Le besoin fondamental non comblé"
        -   content: **(Detailed)** Name the deep, universal human need that is not being met, according to NVC principles (e.g., security, recognition, partnership).
        -   explanation: **(Pedagogical & Personalized)** Briefly explain the core principle of NVC, using the specific need you identified for ${author} as the central example.

    4.  **mentalMechanism**:
        -   title: "Piste sur le mécanisme mental"
        -   content: **(Detailed)** Gently suggest a potential cognitive pattern or mental mechanism at play (e.g., generalization, mind-reading).
        -   explanation: **(Pedagogical & Personalized)** Explain what this cognitive distortion is in simple, non-judgmental terms, and explicitly state how it might be amplifying ${author}'s feelings.

    5.  **childhoodEcho**:
        -   title: "L'écho avec votre enfance"
        -   content: **(Detailed & Insightful)** Analyze the childhood echo provided by ${author}. Provide deep insight. Connect the past event/feeling to the present reaction. For example: "L'écho que vous mentionnez, celui de devoir ranger sans reconnaissance, semble avoir créé une 'règle' intérieure : 'mes efforts sont invisibles'. Aujourd'hui, le sac de sport n'est pas juste un objet, il devient le symbole qui réactive cette vieille blessure d'invisibilité."
        -   explanation: **(Pedagogical & Personalized)** Explain the concept of "emotional triggers" or "schemas" in simple terms, connecting it directly to the situation ${author} is experiencing. Explain that our brains create emotional shortcuts and that recognizing these echoes is a powerful step towards healing.

    6.  **personalPower**:
        -   title: "Votre zone de pouvoir"
        -   content: **(Detailed & Empowering)** Guide ${author} to see what was in their control. It is not about blame, but empowerment. You can ask reflective questions. For example: "Avec le recul, y avait-il un moment où vous auriez pu communiquer votre limite ou votre besoin différemment, peut-être avant que l'agacement ne monte ? Quelle petite action de votre part aurait pu changer votre ressenti à ce moment-là, pour prendre soin de vous-même ?"
        -   explanation: **(Pedagogical & Personalized)** Explain the concept of focusing on one's 'circle of influence'. Emphasize that while we can't control others, we can often influence outcomes and, most importantly, control our own responses and actions to protect our inner peace. This is the path to personal agency.

    The tone must be supportive and empowering. The entire output must be a single JSON object.
    `;
    
    const contentAnalysisSectionSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            explanation: { type: Type.STRING }
        },
        required: ["title", "content", "explanation"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Generate a deep, pedagogical introspection for this annoyance from ${author}: "${annoyance}"`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        story: contentAnalysisSectionSchema,
                        underlyingEmotion: contentAnalysisSectionSchema,
                        unmetNeed: contentAnalysisSectionSchema,
                        mentalMechanism: contentAnalysisSectionSchema,
                        childhoodEcho: contentAnalysisSectionSchema,
                        personalPower: contentAnalysisSectionSchema,
                    },
                    required: ["story", "underlyingEmotion", "unmetNeed", "mentalMechanism", "childhoodEcho", "personalPower"]
                }
            },
        });

        const parsedResponse = JSON.parse(response.text.trim());
        return parsedResponse as DeepIntrospectionAnalysis;

    } catch(e) {
        return handleApiError(e);
    }
};

export const translateAnnoyance = async (annoyance: string, introspection: DeepIntrospectionAnalysis, author: string, partner: string): Promise<AITranslation | { error: string }> => {
  if (URGENT_KEYWORDS.some(keyword => annoyance.toLowerCase().includes(keyword))) {
    return {
      error: `Ceci semble très important et urgent. La meilleure façon de le partager est d'en parler directement à ${partner} quand vous serez calmes. Cette application n'est pas conçue pour les urgences.`
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are an expert couple's counselor acting as a mediator. Your role is to reframe an introspection for ${partner}. The output should be a single, long, narrative, and deeply touching message.
    You are explaining ${author}'s inner world TO ${partner}. The goal is to build a powerful bridge of understanding and empathy. The tone must be extremely gentle, pedagogical, non-accusatory, and focused on vulnerability to be percussive and touching.
    The final 'need' text MUST BE AT LEAST 5 TIMES LONGER than a simple summary. It must be a full, flowing narrative.

    You are given detailed information from an introspection process.

    Your process:
    1.  **validation**: A short, compassionate sentence for ${author} to read before sharing, validating their core emotion.
    2.  **need**: This is the core message for ${partner}. You must construct a detailed, multi-paragraph narrative.
        a.  Start by gently describing the situation from ${author}'s perspective, using "il semble que pour ${author}..." to maintain a mediating tone.
        b.  Reveal the vulnerable underlying emotion you've identified. Explain what this emotion feels like for ${author}.
        c.  **Crucially, you must then build a bridge to the past.** Use the 'childhoodEcho' analysis. Explain how the present situation, seemingly minor, acts as a powerful trigger for a deeper, older wound. Narrate this connection tenderly. For example: "Et ce sentiment d'invisibilité n'est pas nouveau pour ${author}. Il fait écho à des moments de son enfance où [décrire l'écho]. Le sac dans le salon n'est donc plus un simple objet, il devient le symbole qui réactive cette vieille douleur."
        d.  Conclude by expressing the unmet need not as a demand, but as a deep longing and an open invitation for ${partner} to become a healing presence. Frame it as an opportunity for connection. For instance: "Son besoin profond, dans ces moments, est de sentir [décrire le besoin]. C'est une invitation à lui montrer qu'avec vous, l'histoire peut être différente."

    Example of a desired 'need' output (for context: a bag left on the floor):
    "Ce qui semble se passer pour Sylvie dans des moments comme celui-ci, c'est qu'un sentiment profond et douloureux de se sentir invisible émerge. Quand elle voit le sac, l'histoire qu'elle se raconte n'est pas une histoire de négligence, mais une histoire où ses efforts et sa présence ne comptent pas vraiment.

    Ce sentiment est d'autant plus puissant qu'il n'est pas nouveau pour elle. Il fait écho à des expériences de son enfance, où elle a souvent eu l'impression de devoir porter une charge sans être vue ni reconnue pour cela. Le sac dans le salon n'est donc plus un simple objet ; il devient, sans que personne ne le veuille, le symbole qui appuie sur cette ancienne blessure, ravivant la peur de ne pas être importante.

    Son besoin fondamental, à ce moment précis, est donc bien plus profond qu'un simple besoin d'ordre. C'est un besoin vital de se sentir vue, reconnue et de sentir que vous formez une véritable équipe face au quotidien. C'est une invitation tendre à lui montrer qu'aujourd'hui, avec toi, ses efforts sont précieux et que sa présence est la chose la plus importante. Chaque geste de soin pour votre espace partagé devient alors une preuve d'amour qui guérit un peu le passé."

    Your final output must be a JSON object and nothing else.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Original situation with childhood echo included, from ${author}: "${annoyance}"
        Full introspection analysis: "${JSON.stringify(introspection)}"
        
        Based on ALL this information, generate the detailed translation to be shared with ${partner}.
      `,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            validation: { type: Type.STRING, description: `Compassionate validation of ${author}'s emotion.` },
            need: { type: Type.STRING, description: `The underlying need of ${author}, explained in a long, detailed, narrative and pedagogical message TO ${partner}.` }
          },
          required: ["validation", "need"]
        },
      },
    });

    const parsedResponse = JSON.parse(response.text.trim());
    return parsedResponse as AITranslation;

  } catch (error) {
    return handleApiError(error);
  }
};

export const generateNeedTitle = async (originalAnnoyance: string, translatedNeed: string): Promise<{ title: string } | { error: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `
    You are an expert in summarizing relationship dynamics.
    Based on the user's original frustration and the AI-translated need, create a short, evocative, and personalized title in French.
    The title should be 5-8 words max. It should be easy to understand and distinguish one issue from another in a list.

    Example 1:
    - Input: "Il laisse trainer son sac de sport, je me sens invisible." / "Son besoin est de sentir que vous formez une équipe..."
    - Output: { "title": "Le sentiment d'invisibilité face au désordre" }

    Example 2:
    - Input: "Elle est toujours sur son téléphone quand je lui parle." / "Son besoin est de sentir une connexion et une présence de qualité..."
    - Output: { "title": "Le besoin de connexion sans écran" }
    
    Example 3:
    - Input: "Il ne me dit jamais où il va." / "Son besoin est de se sentir en sécurité et incluse dans les décisions..."
    - Output: { "title": "Le manque de communication et de sécurité" }

    Your output MUST be a JSON object with a single "title" key.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Original: "${originalAnnoyance}". Translated: "${translatedNeed}"`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "A short, evocative title in French, max 8 words." }
                    },
                    required: ["title"]
                },
            },
        });
        const parsedResponse = JSON.parse(response.text.trim());
        return parsedResponse as { title: string };
    } catch (error) {
        return handleApiError(error);
    }
};