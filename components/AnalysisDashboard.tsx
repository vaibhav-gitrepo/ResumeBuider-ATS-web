
import React from 'react';
import { ATSAnalysis } from '../types';

interface Props {
  analysis: ATSAnalysis;
}

export const AnalysisDashboard: React.FC<Props> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 border-green-200 bg-green-50';
    if (score >= 50) return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    return 'text-red-600 border-red-200 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className={`p-8 rounded-2xl border-2 text-center ${getScoreColor(analysis.score)}`}>
        <div className="text-sm font-bold uppercase tracking-wider mb-2">ATS Compatibility Score</div>
        <div className="text-6xl font-black mb-1">{analysis.score}%</div>
        <div className="text-lg font-medium">{analysis.matchLevel} Match</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            <span className="bg-green-100 text-green-600 p-1 rounded mr-2">✓</span>
            Matching Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.matchingKeywords.map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            <span className="bg-red-100 text-red-600 p-1 rounded mr-2">!</span>
            Missing Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.missingKeywords.map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">Improvement Roadmap</h3>
        <ul className="space-y-3">
          {analysis.improvementTips.map((tip, i) => (
            <li key={i} className="flex items-start text-sm text-slate-600">
              <span className="text-blue-500 font-bold mr-2">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
