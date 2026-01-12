
import React from 'react';
import { PythonAnalysis } from '../types';

interface Props {
  analysis: PythonAnalysis;
}

export const PythonAnalysisView: React.FC<Props> = ({ analysis }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-2">
        <span className="bg-[#3776AB] text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.25.18l.9.2.73.26.59.33.45.38.34.44.25.51.15.57.08.6.02.62v2.03l-.03.66-.17.81-.39.92-.61.92-.91.84-1.23.63-1.2.33-1.1.1H7.64l-1.1-.1-1.2-.33-1.23-.63-.91-.84-.61-.92-.39-.92-.17-.81-.03-.66V6.22l.02-.62.08-.6.15-.57.25-.51.34-.44.45-.38.59-.33.73-.26.9-.2.94-.07h4.79l.94.07zM9.45 2.04c-.34 0-.61.28-.61.61s.28.61.61.61.61-.28.61-.61-.27-.61-.61-.61zm1.25 15.11l-.02.03-.03.07-.03.11-.03.17-.02.24-.01.32v4.04l.02.63.08.6.15.57.25.51.34.44.45.38.59.33.73.26.9.2.94.07h4.79l.94-.07.9-.2.73-.26.59-.33.45-.38.34-.44.25-.51.15-.57.08-.6.02-.63v-4.04l-.01-.32-.02-.24-.03-.17-.03-.11-.03-.07-.02-.03h-1.29l-.07.19-.19.46-.3.54-.42.59-.58.6-.79.55-1.01.4-1.1.21-1.1.1H13.6l-1.1-.1-1.1-.21-1.01-.4-.79-.55-.58-.6-.42-.59-.3-.54-.19-.46-.07-.19h-1.29zm2.46 4.81c.34 0 .61-.28.61-.61s-.28-.61-.61-.61-.61.28-.61.61.28.61.61.61z" />
          </svg>
          PYTHON ENGINE
        </span>
      </div>

      <h3 className="font-bold text-slate-800 mb-4">Keyword Density Analysis</h3>
      
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 bg-slate-100 h-4 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000" 
            style={{ width: `${analysis.densityScore}%` }}
          />
        </div>
        <span className="text-sm font-bold text-blue-600">{analysis.densityScore}% Match</span>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Detected Skills</h4>
        {analysis.keywordMatches.length > 0 ? (
          analysis.keywordMatches.slice(0, 5).map((match, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">{match.keyword}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-400" 
                    style={{ width: `${Math.min(match.count * 20, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-400">x{match.count}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 italic">No significant keyword matches detected.</p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Priority Gaps (Python Logic)</h4>
        <div className="flex flex-wrap gap-2">
          {analysis.unmatchedJdTerms.slice(0, 8).map((term, i) => (
            <span key={i} className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-[10px] font-bold">
              MISSING: {term.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
