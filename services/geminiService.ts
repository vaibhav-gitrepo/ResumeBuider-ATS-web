
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, ATSAnalysis, TailoredBulletPoint, ImprovementSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeResumeMatch = async (resume: ResumeData, jobDescription: string): Promise<ATSAnalysis> => {
  const prompt = `Analyze the following resume against the job description.
    Resume: ${JSON.stringify(resume)}
    Job Description: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER, description: "ATS score from 0-100" },
          matchLevel: { type: Type.STRING, description: "Low, Medium, or High" },
          missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          matchingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["score", "matchLevel", "missingKeywords", "matchingKeywords", "strengths", "weaknesses", "improvementTips"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const tailorBulletPoints = async (bullets: string[], jobDescription: string): Promise<TailoredBulletPoint[]> => {
  const prompt = `Rewrite the following resume bullet points to better align with this job description. Focus on impact, metrics, and relevant keywords.
    Bullet Points: ${JSON.stringify(bullets)}
    Job Description: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            improved: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["original", "improved", "reasoning"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const suggestFieldImprovement = async (fieldName: string, currentContent: string, jobDescription: string): Promise<ImprovementSuggestion[]> => {
  const prompt = `Critique and improve the following ${fieldName} section of a resume based on this job description. 
    Provide 4 distinct versions: 
    1. Results-Oriented (focus on metrics and numbers)
    2. Skill-Heavy (focus on technical keyword density for ATS)
    3. Creative/Narrative (compelling career story)
    4. Action-Focused (strong verbs and direct impact)
    
    Make them highly competitive and punchy.
    
    Current Content: ${currentContent}
    Job Description: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            suggested: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["original", "suggested", "reason"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};
