
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, ATSAnalysis, TailoredBulletPoint, ImprovementSuggestion, SmartTemplate } from "../types";

// Helper to get a fresh instance with the current environment key
// Instantiating GoogleGenAI inside a factory function ensures the latest API key from process.env is used.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Resume analysis and tailoring requires complex reasoning, mapping to gemini-3-pro-preview.
const MODEL_NAME = "gemini-3-pro-preview";

export const analyzeResumeMatch = async (resume: ResumeData, jobDescription: string): Promise<ATSAnalysis> => {
  const ai = getAI();
  const prompt = `Analyze the following resume against the job description. Provide a detailed matching analysis.
    Resume: ${JSON.stringify(resume)}
    Job Description: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
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

  // response.text is a getter property, not a method.
  return JSON.parse(response.text || '{}');
};

export const tailorBulletPoints = async (bullets: string[], jobDescription: string): Promise<TailoredBulletPoint[]> => {
  const ai = getAI();
  const prompt = `Rewrite the following resume bullet points to better align with this job description. Focus on impact, metrics, and relevant keywords.
    Bullet Points: ${JSON.stringify(bullets)}
    Job Description: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
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

  return JSON.parse(response.text || '[]');
};

export const suggestFieldImprovement = async (fieldName: string, currentContent: string, jobDescription: string): Promise<ImprovementSuggestion[]> => {
  const ai = getAI();
  const prompt = `Critique and improve the following ${fieldName} section of a resume based on this job description. 
    Provide 4 distinct versions: 
    1. Results-Oriented (focus on metrics and numbers)
    2. Skill-Heavy (focus on technical keyword density for ATS)
    3. Creative/Narrative (compelling career story)
    4. Action-Focused (strong verbs and direct impact)
    
    Current Content: ${currentContent}
    Job Description: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
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

  return JSON.parse(response.text || '[]');
};

export const validateSkills = async (currentSkills: string[], jobDescription: string): Promise<ImprovementSuggestion[]> => {
  const ai = getAI();
  const prompt = `Review these skills: [${currentSkills.join(", ")}]. 
    Standardize these to the most concise, industry-recognized technical keywords (e.g. use 'AWS' instead of 'Amazon Web Services', 'K8s' instead of 'Kubernetes').
    The goal is minimum character count while maintaining high ATS impact and industry relevance.
    Job Description context: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING, description: "The original skill entered by user" },
            suggested: { type: Type.STRING, description: "The concise industry standard technical keyword" },
            reason: { type: Type.STRING, description: "Why this concise keyword is better for ATS" }
          },
          required: ["original", "suggested", "reason"]
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};

export const generateSmartTemplates = async (resume: ResumeData, jobDescription: string): Promise<SmartTemplate[]> => {
  const ai = getAI();
  const prompt = `Based on the following resume and target job description, generate 3 smart "Persona Templates".
    Each template should provide a custom Summary and a set of concise Industry-Standard Skills optimized for that specific career path.
    Resume: ${JSON.stringify(resume)}
    Job Description: ${jobDescription}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Template Name e.g. 'Senior Architect'" },
            description: { type: Type.STRING, description: "Short description of the strategy used" },
            summary: { type: Type.STRING, description: "Optimized Professional Summary" },
            skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Standardized Concise Technical Skills" }
          },
          required: ["name", "description", "summary", "skills"]
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};
