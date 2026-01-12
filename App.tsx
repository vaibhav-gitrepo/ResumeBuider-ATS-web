
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResumeData, AppState, ATSAnalysis, PythonAnalysis, ImprovementSuggestion } from './types';
import { analyzeResumeMatch, tailorBulletPoints, suggestFieldImprovement } from './services/geminiService';
import { ResumeEditor } from './components/ResumeEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { PythonAnalysisView } from './components/PythonAnalysisView';

// Declare Pyodide for TS
declare global {
  interface Window {
    loadPyodide: any;
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
    },
    {
      id: "exp-2",
      company: "Innovate AI",
      role: "Full Stack Engineer",
      period: "2018 - 2020",
      description: [
        "Developed features for a large-scale data dashboard.",
        "Maintained legacy codebases and improved stability.",
        "Mentored junior developers on best practices."
      ]
    }
  ],
  education: [
    { id: "edu-1", institution: "State University", degree: "B.S. Computer Science", year: "2018" }
  ],
  skills: ["React", "TypeScript", "Node.js", "AWS", "Docker", "PostgreSQL"]
};

const PYTHON_SCRIPT = `
import json
import re

def analyze_resume(resume_text, jd_text):
    # Common tech keywords for deterministic matching
    keywords = ["react", "python", "typescript", "javascript", "node.js", "aws", "docker", "kubernetes", "sql", "nosql", "ci/cd", "agile", "scrum", "cloud", "api", "backend", "frontend"]
    
    resume_text = resume_text.lower()
    jd_text = jd_text.lower()
    
    found_in_resume = {}
    found_in_jd = []
    
    for kw in keywords:
        # Match keywords in JD
        if re.search(r'\\b' + re.escape(kw) + r'\\b', jd_text):
            found_in_jd.append(kw)
            # Count matches in resume
            matches = re.findall(r'\\b' + re.escape(kw) + r'\\b', resume_text)
            found_in_resume[kw] = len(matches)
            
    matches_list = []
    unmatched_jd = []
    
    for kw in found_in_jd:
        if found_in_resume.get(kw, 0) > 0:
            matches_list.append({
                "keyword": kw,
                "count": found_in_resume[kw],
                "importance": 1.0 # Simplified
            })
        else:
            unmatched_jd.append(kw)
            
    score = 0
    if len(found_in_jd) > 0:
        score = int((len(matches_list) / len(found_in_jd)) * 100)
        
    return json.dumps({
        "densityScore": score,
        "keywordMatches": matches_list,
        "unmatchedJdTerms": unmatched_jd
    })
`;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    resume: DEFAULT_RESUME,
    jobDescription: "",
    analysis: null,
    pythonAnalysis: null,
    tailoredBullets: {},
    fieldSuggestions: {},
    isAnalyzing: false,
    isTailoring: false,
    isImprovingField: null,
    isPythonLoading: true
  });

  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    const initPyodide = async () => {
      try {
        pyodideRef.current = await window.loadPyodide();
        setState(prev => ({ ...prev, isPythonLoading: false }));
      } catch (e) {
        console.error("Pyodide failed to load", e);
        setState(prev => ({ ...prev, isPythonLoading: false }));
      }
    };
    initPyodide();
  }, []);

  const runPythonAnalysis = async (resume: ResumeData, jd: string): Promise<PythonAnalysis> => {
    if (!pyodideRef.current) throw new Error("Python not loaded");
    
    const resumeText = `${resume.summary} ${resume.skills.join(' ')} ${resume.experience.map(e => e.description.join(' ')).join(' ')}`;
    
    const pyCode = `
${PYTHON_SCRIPT}
analyze_resume(${JSON.stringify(resumeText)}, ${JSON.stringify(jd)})
    `;
    
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
      
      setState(prev => ({ 
        ...prev, 
        analysis: aiResult, 
        pythonAnalysis: pyResult,
        isAnalyzing: false 
      }));
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Please try again.");
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleTailorExp = async (expId: string, bullets: string[]) => {
    if (!state.jobDescription) {
      alert("Please provide a Job Description first!");
      return;
    }
    setState(prev => ({ ...prev, isTailoring: true }));
    try {
      const results = await tailorBulletPoints(bullets, state.jobDescription);
      setState(prev => ({
        ...prev,
        tailoredBullets: { ...prev.tailoredBullets, [expId]: results },
        isTailoring: false
      }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isTailoring: false }));
    }
  };

  const handleImproveField = async (fieldName: string, content: string, keyOverride?: string) => {
    if (!state.jobDescription) {
      alert("Please provide a Job Description first!");
      return;
    }
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
      console.error(error);
      setState(prev => ({ ...prev, isImprovingField: null }));
    }
  };

  const handleClearSuggestions = (key: string) => {
    setState(prev => {
      const newSugs = { ...prev.fieldSuggestions };
      delete newSugs[key];
      return { ...prev, fieldSuggestions: newSugs };
    });
  };

  const handleUpdateResume = (newData: ResumeData) => {
    setState(prev => ({ ...prev, resume: newData }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
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
                  <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 rounded animate-pulse-soft">PYTHON INITIALIZING...</span>
                ) : (
                  <span className="text-[10px] bg-green-400 text-green-900 px-1.5 rounded">PYTHON ENGINE READY</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-4">
             <button className="px-6 py-2 bg-indigo-500 text-white rounded-full font-bold text-sm shadow-md hover:bg-indigo-400 transition-all border border-indigo-300/30">
               Save Draft
             </button>
             <button className="px-6 py-2 bg-white text-indigo-600 rounded-full font-bold text-sm shadow-md hover:bg-slate-50 transition-all">
               Export PDF
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
            <div className="relative">
              <textarea
                className="w-full h-80 p-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-300"
                placeholder="Paste the full Job Description here..."
                value={state.jobDescription}
                onChange={(e) => setState(prev => ({ ...prev, jobDescription: e.target.value }))}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={state.isAnalyzing || !state.jobDescription || state.isPythonLoading}
              className="w-full mt-4 py-4 gradient-bg text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:opacity-90 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {state.isAnalyzing ? 'Analyzing Alignment...' : 'Calculate ATS Fit'}
            </button>
          </div>

          {(state.analysis || state.pythonAnalysis) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-indigo-500">02.</span> Analytics Dashboard
              </h2>
              {state.pythonAnalysis && <PythonAnalysisView analysis={state.pythonAnalysis} />}
              {state.analysis && <AnalysisDashboard analysis={state.analysis} />}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="sticky top-28">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <span className="text-indigo-500">03.</span> Resume Architect
              </h2>
              <div className="bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Live Editor Mode</span>
              </div>
            </div>
            
            <ResumeEditor
              data={state.resume}
              tailoredBullets={state.tailoredBullets}
              fieldSuggestions={state.fieldSuggestions}
              onUpdate={handleUpdateResume}
              onTailorExperience={handleTailorExp}
              onImproveField={handleImproveField}
              onClearSuggestions={handleClearSuggestions}
              isTailoring={state.isTailoring}
              isImprovingField={state.isImprovingField}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 px-4 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-slate-400">
          <div>
            <div className="text-indigo-600 font-black text-xl mb-4">ResuMatch AI</div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Hybrid engine: Deterministic Python matching + Gemini 3 Generative AI.
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-slate-400 mb-2">Powered by</div>
            <div className="flex gap-4">
               <span className="bg-[#3776AB] text-white px-3 py-1 rounded-md text-[10px] font-bold">PYTHON 3.12</span>
               <span className="bg-indigo-600 text-white px-3 py-1 rounded-md text-[10px] font-bold">GEMINI 3 PRO</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
