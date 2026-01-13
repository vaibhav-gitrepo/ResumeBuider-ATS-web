
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResumeData, AppState, ATSAnalysis, PythonAnalysis, ImprovementSuggestion, TailoredBulletPoint, SmartTemplate } from './types';
import { analyzeResumeMatch, tailorBulletPoints, suggestFieldImprovement, validateSkills, generateSmartTemplates } from './services/geminiService';
import { ResumeEditor } from './components/ResumeEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { PythonAnalysisView } from './components/PythonAnalysisView';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    loadPyodide: any;
    // Removed readonly modifier to fix interface merging conflict where other declarations might not have it
    aistudio: AIStudio;
  }
}

const DEFAULT_RESUME: ResumeData = {
  fullName: "Alex Rivera",
  email: "alex.rivera@example.com",
  phone: "(555) 012-3456",
  summary: "Results-driven Software Engineer with 5 years of experience in full-stack development. Skilled in building scalable web applications and leading technical teams.",
  experience: [
    {
      id: "exp-1",
      company: "TechFlow Systems",
      role: "Senior Developer",
      period: "2020 - Present",
      description: [
        "Led a team of 5 developers to build a SaaS platform.",
        "Improved system performance by 30%.",
        "Collaborated with product managers to define roadmaps."
      ]
    }
  ],
  education: [
    { id: "edu-1", institution: "State University", degree: "B.S. Computer Science", year: "2018" }
  ],
  skills: ["React", "TypeScript", "Node.js", "AWS", "Docker"]
};

const PYTHON_SCRIPT = `
import json
import re

def analyze_resume(resume_text, jd_text):
    keywords = ["react", "python", "typescript", "javascript", "node.js", "aws", "docker", "kubernetes", "sql", "nosql", "ci/cd", "agile", "scrum", "cloud", "api", "backend", "frontend"]
    resume_text = resume_text.lower()
    jd_text = jd_text.lower()
    found_in_resume = {}
    found_in_jd = []
    for kw in keywords:
        if re.search(r'\\b' + re.escape(kw) + r'\\b', jd_text):
            found_in_jd.append(kw)
            matches = re.findall(r'\\b' + re.escape(kw) + r'\\b', resume_text)
            found_in_resume[kw] = len(matches)
    matches_list = []
    unmatched_jd = []
    for kw in found_in_jd:
        if found_in_resume.get(kw, 0) > 0:
            matches_list.append({"keyword": kw, "count": found_in_resume[kw], "importance": 1.0})
        else:
            unmatched_jd.append(kw)
    score = 0
    if len(found_in_jd) > 0:
        score = int((len(matches_list) / len(found_in_jd)) * 100)
    return json.dumps({"densityScore": score, "keywordMatches": matches_list, "unmatchedJdTerms": unmatched_jd})
`;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    resume: DEFAULT_RESUME,
    jobDescription: "",
    analysis: null,
    pythonAnalysis: null,
    tailoredBullets: {},
    fieldSuggestions: {},
    smartTemplates: [],
    isAnalyzing: false,
    isTailoring: false,
    isImprovingField: null,
    isGeneratingTemplates: false,
    isPythonLoading: true
  });

  const [hasKey, setHasKey] = useState<boolean>(false);
  const [showQuotaError, setShowQuotaError] = useState<boolean>(false);
  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    };
    checkKey();

    const initPyodide = async () => {
      try {
        pyodideRef.current = await window.loadPyodide();
        setState(prev => ({ ...prev, isPythonLoading: false }));
      } catch (e) {
        setState(prev => ({ ...prev, isPythonLoading: false }));
      }
    };
    initPyodide();
  }, []);

  const handleOpenKeyDialog = async () => {
    await window.aistudio.openSelectKey();
    // Assuming the key selection was successful to mitigate potential race conditions as per SDK guidelines
    setHasKey(true);
    setShowQuotaError(false);
  };

  const handleApiError = (error: any) => {
    console.error("API Error:", error);
    const errorMsg = error?.message || "";
    if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("limit")) {
      setShowQuotaError(true);
    } else if (errorMsg.includes("entity was not found")) {
      handleOpenKeyDialog();
    } else {
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const runPythonAnalysis = async (resume: ResumeData, jd: string): Promise<PythonAnalysis> => {
    if (!pyodideRef.current) throw new Error("Python not loaded");
    const resumeText = `${resume.summary} ${resume.skills.join(' ')} ${resume.experience.map(e => e.description.join(' ')).join(' ')}`;
    const pyCode = `${PYTHON_SCRIPT}\nanalyze_resume(${JSON.stringify(resumeText)}, ${JSON.stringify(jd)})`;
    const resultJson = await pyodideRef.current.runPythonAsync(pyCode);
    return JSON.parse(resultJson);
  };

  const handleAnalyze = async () => {
    if (!state.resume || !state.jobDescription) return;
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const [aiResult, pyResult] = await Promise.all([
        analyzeResumeMatch(state.resume, state.jobDescription),
        runPythonAnalysis(state.resume, state.jobDescription)
      ]);
      setState(prev => ({ ...prev, analysis: aiResult, pythonAnalysis: pyResult, isAnalyzing: false }));
    } catch (error) {
      handleApiError(error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleTailorExp = async (expId: string, bullets: string[]) => {
    if (!state.jobDescription) return alert("Paste a job description first.");
    setState(prev => ({ ...prev, isTailoring: true }));
    try {
      const results = await tailorBulletPoints(bullets, state.jobDescription);
      setState(prev => ({
        ...prev,
        tailoredBullets: { ...prev.tailoredBullets, [expId]: results },
        isTailoring: false
      }));
    } catch (error) {
      handleApiError(error);
      setState(prev => ({ ...prev, isTailoring: false }));
    }
  };

  const handleImproveField = async (fieldName: string, content: string, keyOverride?: string) => {
    if (!state.jobDescription) return alert("Paste a job description first.");
    const storageKey = keyOverride || fieldName;
    setState(prev => ({ ...prev, isImprovingField: storageKey }));
    try {
      const suggestions = await suggestFieldImprovement(fieldName, content, state.jobDescription);
      setState(prev => ({
        ...prev,
        fieldSuggestions: { ...prev.fieldSuggestions, [storageKey]: suggestions },
        isImprovingField: null
      }));
    } catch (error) {
      handleApiError(error);
      setState(prev => ({ ...prev, isImprovingField: null }));
    }
  };

  const handleRefineSkills = async () => {
    if (!state.jobDescription) return alert("Paste a job description first.");
    setState(prev => ({ ...prev, isImprovingField: 'skills' }));
    try {
      const suggestions = await validateSkills(state.resume.skills, state.jobDescription);
      const newSuggestions: Record<string, ImprovementSuggestion[]> = {};
      
      suggestions.forEach(sug => {
        if (sug.original !== sug.suggested) {
          newSuggestions[`skill-${sug.original}`] = [sug];
        }
      });

      setState(prev => ({
        ...prev,
        fieldSuggestions: { ...prev.fieldSuggestions, ...newSuggestions },
        isImprovingField: null
      }));
    } catch (error) {
      handleApiError(error);
      setState(prev => ({ ...prev, isImprovingField: null }));
    }
  };

  const handleGenerateSmartTemplates = async () => {
    if (!state.jobDescription) return alert("Paste a job description first.");
    setState(prev => ({ ...prev, isGeneratingTemplates: true }));
    try {
      const templates = await generateSmartTemplates(state.resume, state.jobDescription);
      setState(prev => ({
        ...prev,
        smartTemplates: templates,
        isGeneratingTemplates: false
      }));
    } catch (error) {
      handleApiError(error);
      setState(prev => ({ ...prev, isGeneratingTemplates: false }));
    }
  };

  const handleClearSuggestions = (key: string) => {
    setState(prev => {
      const newSugs = { ...prev.fieldSuggestions };
      delete newSugs[key];
      return { ...prev, fieldSuggestions: newSugs };
    });
  };

  const handleClearTailored = (expId: string) => {
    setState(prev => {
      const newTailored = { ...prev.tailoredBullets };
      delete newTailored[expId];
      return { ...prev, tailoredBullets: newTailored };
    });
  };

  const handleClearTemplates = () => {
    setState(prev => ({ ...prev, smartTemplates: [] }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative">
      {showQuotaError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-10 max-w-lg w-full text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">Quota Exceeded</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              The shared API quota for this app has been reached. Connect your own key to continue.
            </p>
            <div className="space-y-4">
              <button 
                onClick={handleOpenKeyDialog}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
              >
                Connect My Own Key
              </button>
              {/* Mandatory billing documentation link per requirements */}
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-xs font-bold text-indigo-500 hover:underline">
                Billing Documentation
              </a>
              <button onClick={() => setShowQuotaError(false)} className="text-xs text-slate-400 font-bold hover:text-slate-600 pt-2">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="gradient-bg text-white py-6 px-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">ResuMatch AI</h1>
              <div className="flex items-center gap-2">
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Precision ATS Tailoring</p>
                {state.isPythonLoading ? (
                  <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 rounded animate-pulse-soft">PYTHON INIT...</span>
                ) : (
                  <span className="text-[10px] bg-green-400 text-green-900 px-1.5 rounded">PYTHON READY</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={handleOpenKeyDialog}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all border ${hasKey ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
            >
              <div className={`h-2 w-2 rounded-full ${hasKey ? 'bg-green-300' : 'bg-amber-300 animate-pulse'}`}></div>
              {hasKey ? 'Key Connected' : 'Connect API Key'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-indigo-500">01.</span> Job Target
            </h2>
            <textarea
              className="w-full h-80 p-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
              placeholder="Paste Job Description..."
              value={state.jobDescription}
              onChange={(e) => setState(prev => ({ ...prev, jobDescription: e.target.value }))}
            />
            <button
              onClick={handleAnalyze}
              disabled={state.isAnalyzing || !state.jobDescription || state.isPythonLoading}
              className="w-full mt-4 py-4 gradient-bg text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {state.isAnalyzing ? 'Analyzing Alignment...' : 'Calculate ATS Fit'}
            </button>
          </div>

          {(state.analysis || state.pythonAnalysis) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-slate-800">02. Analysis</h2>
              {state.pythonAnalysis && <PythonAnalysisView analysis={state.pythonAnalysis} />}
              {state.analysis && <AnalysisDashboard analysis={state.analysis} />}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="sticky top-28">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-indigo-500">03.</span> Resume Architect
            </h2>
            <ResumeEditor
              data={state.resume}
              tailoredBullets={state.tailoredBullets}
              fieldSuggestions={state.fieldSuggestions}
              smartTemplates={state.smartTemplates}
              onUpdate={(d) => setState(prev => ({ ...prev, resume: d }))}
              onTailorExperience={handleTailorExp}
              onImproveField={handleImproveField}
              onClearSuggestions={handleClearSuggestions}
              onClearTailored={handleClearTailored}
              onClearTemplates={handleClearTemplates}
              onRefineSkills={handleRefineSkills}
              onGenerateTemplates={handleGenerateSmartTemplates}
              isTailoring={state.isTailoring}
              isImprovingField={state.isImprovingField}
              isGeneratingTemplates={state.isGeneratingTemplates}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
