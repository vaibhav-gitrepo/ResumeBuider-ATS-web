
export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  period: string;
  description: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  year: string;
}

export interface ATSAnalysis {
  score: number;
  matchLevel: 'Low' | 'Medium' | 'High';
  missingKeywords: string[];
  matchingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
}

export interface PythonKeywordResult {
  keyword: string;
  count: number;
  importance: number; 
}

export interface PythonAnalysis {
  densityScore: number;
  keywordMatches: PythonKeywordResult[];
  unmatchedJdTerms: string[];
}

export interface TailoredBulletPoint {
  original: string;
  improved: string;
  reasoning: string;
}

export interface ImprovementSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface SmartTemplate {
  name: string;
  description: string;
  summary: string;
  skills: string[];
}

export interface AppState {
  resume: ResumeData;
  jobDescription: string;
  analysis: ATSAnalysis | null;
  pythonAnalysis: PythonAnalysis | null;
  tailoredBullets: Record<string, TailoredBulletPoint[]>;
  fieldSuggestions: Record<string, ImprovementSuggestion[]>;
  smartTemplates: SmartTemplate[];
  isAnalyzing: boolean;
  isTailoring: boolean;
  isImprovingField: string | null;
  isGeneratingTemplates: boolean;
  isPythonLoading: boolean;
}
