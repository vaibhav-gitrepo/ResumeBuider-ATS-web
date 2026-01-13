
import React, { useRef, useState } from 'react';
import { ResumeData, Experience, ImprovementSuggestion, TailoredBulletPoint, SmartTemplate } from '../types';

interface Props {
  data: ResumeData;
  tailoredBullets: Record<string, TailoredBulletPoint[]>;
  fieldSuggestions: Record<string, ImprovementSuggestion[]>;
  smartTemplates: SmartTemplate[];
  onUpdate: (data: ResumeData) => void;
  onTailorExperience: (expId: string, bullets: string[]) => void;
  onImproveField: (fieldName: string, content: string, keyOverride?: string) => void;
  onClearSuggestions?: (key: string) => void;
  onClearTailored?: (expId: string) => void;
  onClearTemplates: () => void;
  onRefineSkills: () => void;
  onGenerateTemplates: () => void;
  isTailoring: boolean;
  isImprovingField: string | null;
  isGeneratingTemplates: boolean;
}

export const ResumeEditor: React.FC<Props> = ({ 
  data, 
  tailoredBullets,
  fieldSuggestions,
  smartTemplates,
  onUpdate, 
  onTailorExperience, 
  onImproveField,
  onClearSuggestions,
  onClearTailored,
  onClearTemplates,
  onRefineSkills,
  onGenerateTemplates,
  isTailoring,
  isImprovingField,
  isGeneratingTemplates
}) => {
  const originalValues = useRef<Record<string, any>>({});
  const [draggedBullet, setDraggedBullet] = useState<{ expId: string, idx: number } | null>(null);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<number | null>(null);

  const handleFieldChange = (field: keyof ResumeData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleExperienceChange = (id: string, field: keyof Experience, value: any) => {
    const newExperience = data.experience.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    onUpdate({ ...data, experience: newExperience });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: `exp-${Date.now()}`,
      company: "",
      role: "",
      period: "",
      description: [""]
    };
    onUpdate({ ...data, experience: [...data.experience, newExp] });
  };

  const removeExperience = (id: string) => {
    if (confirm("Delete this experience entry?")) {
      onUpdate({ ...data, experience: data.experience.filter(exp => exp.id !== id) });
    }
  };

  const applyTailoredBatch = (expId: string) => {
    const tailored = tailoredBullets[expId];
    if (!tailored) return;
    
    const newBullets = tailored.map(t => t.improved);
    handleExperienceChange(expId, 'description', newBullets);
    if (onClearTailored) onClearTailored(expId);
  };

  const handleApplySelectedTemplate = () => {
    if (selectedTemplateIdx === null) return;
    const template = smartTemplates[selectedTemplateIdx];
    if (confirm(`Apply the "${template.name}" strategy? This will replace your summary and skills.`)) {
      onUpdate({
        ...data,
        summary: template.summary,
        skills: template.skills
      });
      setSelectedTemplateIdx(null);
      onClearTemplates();
    }
  };

  const applySuggestion = (fieldKey: string, suggestedValue: string) => {
    if (!originalValues.current[fieldKey]) {
      if (fieldKey === 'summary') originalValues.current[fieldKey] = data.summary;
      else if (fieldKey === 'skills') originalValues.current[fieldKey] = [...data.skills];
      else if (fieldKey.startsWith('skill-')) {
          const originalSkill = fieldKey.replace('skill-', '');
          originalValues.current[fieldKey] = originalSkill;
      }
      else if (fieldKey.startsWith('bullet-')) {
        const [_, expId, idxStr] = fieldKey.split('-');
        const exp = data.experience.find(e => e.id === expId);
        if (exp) originalValues.current[fieldKey] = exp.description[parseInt(idxStr)];
      }
    }

    if (fieldKey === 'summary') {
      handleFieldChange('summary', suggestedValue);
    } else if (fieldKey.startsWith('skill-')) {
      const originalSkill = fieldKey.replace('skill-', '');
      const newSkills = data.skills.map(s => s === originalSkill ? suggestedValue : s);
      handleFieldChange('skills', newSkills);
    } else if (fieldKey.startsWith('bullet-')) {
      const [_, expId, idxStr] = fieldKey.split('-');
      const idx = parseInt(idxStr);
      const exp = data.experience.find(e => e.id === expId);
      if (exp) {
        const newDesc = [...exp.description];
        newDesc[idx] = suggestedValue;
        handleExperienceChange(expId, 'description', newDesc);
      }
    }

    if (onClearSuggestions) onClearSuggestions(fieldKey);
  };

  const handleDragStart = (expId: string, idx: number) => {
    setDraggedBullet({ expId, idx });
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedBullet) setDragTargetIdx(targetIdx);
  };

  const handleDrop = (expId: string, targetIdx: number) => {
    setDragTargetIdx(null);
    if (!draggedBullet || draggedBullet.expId !== expId) return;
    
    const exp = data.experience.find(e => e.id === expId);
    if (!exp) return;

    const newDescription = [...exp.description];
    const [movedBullet] = newDescription.splice(draggedBullet.idx, 1);
    newDescription.splice(targetIdx, 0, movedBullet);
    
    handleExperienceChange(expId, 'description', newDescription);
    setDraggedBullet(null);
  };

  const SuggestionGrid = ({ fieldKey }: { fieldKey: string }) => {
    const suggestions = fieldSuggestions[fieldKey];
    if (!suggestions) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
        {suggestions.map((sug, idx) => (
          <div key={idx} className="flex flex-col p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl hover:shadow-sm transition-all">
            <p className="text-[11px] text-slate-800 font-bold mb-2">"{sug.suggested}"</p>
            <p className="text-[9px] text-indigo-600 font-medium mb-3">{sug.reason}</p>
            <button 
              onClick={() => applySuggestion(fieldKey, sug.suggested)}
              className="w-full py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all"
            >
              Apply Change
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-12 bg-white p-6 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-200">
      {/* Smart Templates Section */}
      {smartTemplates.length > 0 && (
        <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">AI Persona Templates</h3>
              <p className="text-[10px] text-slate-500 mt-1">Select a template to view the suggested strategy.</p>
            </div>
            <button 
              onClick={onGenerateTemplates}
              disabled={isGeneratingTemplates}
              className="px-4 py-2 bg-white text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              {isGeneratingTemplates ? 'Analyzing...' : 'Refresh'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {smartTemplates.map((template, idx) => {
              const isSelected = selectedTemplateIdx === idx;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedTemplateIdx(idx)}
                  className={`relative cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col h-full ${
                    isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.03] ring-4 ring-indigo-100' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>{template.name}</h4>
                    {isSelected && (
                      <div className="bg-white/20 p-1 rounded-full">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{template.description}</p>
                </div>
              );
            })}
          </div>

          {selectedTemplateIdx !== null && (
            <button 
              onClick={handleApplySelectedTemplate}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-300"
            >
              Apply Strategy to Resume
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </section>
      )}

      {/* Placeholder when no templates exist */}
      {smartTemplates.length === 0 && !isGeneratingTemplates && (
        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-[2rem]">
          <button 
            onClick={onGenerateTemplates}
            className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-widest"
          >
            + Generate AI Persona Strategy
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="border-b border-slate-100 pb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <input 
            className="text-4xl font-black text-slate-900 w-full border-b border-transparent focus:border-indigo-500 outline-none transition-all"
            value={data.fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            placeholder="Your Full Name"
          />
          <div className="flex flex-wrap gap-6 text-sm">
            <input className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-48" value={data.email} onChange={(e) => handleFieldChange('email', e.target.value)} placeholder="Email" />
            <input className="bg-transparent border-b border-transparent focus:border-indigo-400 outline-none w-48" value={data.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} placeholder="Phone" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Professional Summary</h3>
          <button 
            onClick={() => onImproveField('summary', data.summary)}
            disabled={isImprovingField === 'summary'}
            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800"
          >
            {isImprovingField === 'summary' ? 'Improving...' : 'AI Improve'}
          </button>
        </div>
        <textarea
          rows={4}
          className="w-full text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 outline-none focus:bg-white focus:border-indigo-300 transition-all"
          value={data.summary}
          onChange={(e) => handleFieldChange('summary', e.target.value)}
        />
        <SuggestionGrid fieldKey="summary" />
      </section>

      {/* Experience */}
      <section className="space-y-10">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Experience</h3>
        {data.experience.map((exp) => (
          <div key={exp.id} className="relative bg-slate-50/30 p-8 rounded-[2rem] border border-slate-100 group">
             <div className="flex justify-between items-start mb-6">
                <div className="flex-grow space-y-2">
                   <input className="block w-full text-xl font-black text-slate-800 bg-transparent outline-none" value={exp.role} onChange={(e) => handleExperienceChange(exp.id, 'role', e.target.value)} placeholder="Role Title" />
                   <input className="block w-full text-sm font-bold text-indigo-600 bg-transparent outline-none" value={exp.company} onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)} placeholder="Company" />
                </div>
                <div className="flex flex-col items-end gap-2">
                   <input className="text-xs text-slate-400 font-mono bg-transparent outline-none text-right" value={exp.period} onChange={(e) => handleExperienceChange(exp.id, 'period', e.target.value)} placeholder="Period" />
                   <button onClick={() => removeExperience(exp.id)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
             </div>

             <ul className="space-y-2">
               {exp.description.map((bullet, idx) => {
                 const bulletKey = `bullet-${exp.id}-${idx}`;
                 const isDragging = draggedBullet?.idx === idx && draggedBullet?.expId === exp.id;
                 const isTarget = dragTargetIdx === idx && draggedBullet?.expId === exp.id;
                 
                 return (
                   <li 
                    key={idx} 
                    draggable
                    onDragStart={() => handleDragStart(exp.id, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(exp.id, idx)}
                    className={`flex flex-col gap-2 p-2 rounded-xl border-2 transition-all duration-200 ${isDragging ? 'opacity-20 bg-indigo-50 border-indigo-200' : 'border-transparent'} ${isTarget ? 'border-t-indigo-400 bg-indigo-50/20' : ''} hover:bg-white hover:border-slate-100 cursor-grab active:cursor-grabbing`}
                   >
                      <div className="flex gap-3 group/bullet items-start">
                        <div className="mt-2.5 flex flex-col items-center gap-0.5 shrink-0 opacity-20 group-hover/bullet:opacity-100 transition-opacity">
                          <div className="h-1 w-1 rounded-full bg-slate-900" />
                          <div className="h-1 w-1 rounded-full bg-slate-900" />
                          <div className="h-1 w-1 rounded-full bg-slate-900" />
                        </div>
                        <textarea 
                          rows={2} 
                          className="flex-grow bg-transparent text-sm text-slate-600 border-b border-transparent focus:border-indigo-200 outline-none resize-none leading-relaxed"
                          value={bullet}
                          onChange={(e) => {
                            const newDesc = [...exp.description];
                            newDesc[idx] = e.target.value;
                            handleExperienceChange(exp.id, 'description', newDesc);
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => onImproveField('experience bullet', bullet, bulletKey)}
                            disabled={isImprovingField === bulletKey}
                            className="opacity-0 group-hover/bullet:opacity-100 text-[9px] font-black text-indigo-400 hover:text-indigo-600 transition-all uppercase px-2 py-1 rounded-lg hover:bg-indigo-50"
                          >
                            {isImprovingField === bulletKey ? '...' : 'Tailor'}
                          </button>
                        </div>
                      </div>
                      <SuggestionGrid fieldKey={bulletKey} />
                   </li>
                 );
               })}
             </ul>

             {tailoredBullets[exp.id] && (
               <div className="mt-6 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest">AI Tailored Content Ready</h4>
                  <button 
                    onClick={() => applyTailoredBatch(exp.id)}
                    className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-all shadow-md"
                  >
                    Apply All
                  </button>
                </div>
                <div className="space-y-4">
                  {tailoredBullets[exp.id].map((item, i) => (
                    <div key={i} className="text-[11px] text-emerald-900 border-l-2 border-emerald-200 pl-3">
                      <p className="font-bold leading-relaxed mb-1">Improved: {item.improved}</p>
                      <p className="text-[9px] text-emerald-600 italic">Reason: {item.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
             )}

             <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => handleExperienceChange(exp.id, 'description', [...exp.description, ""])}
                  className="text-[10px] font-black text-slate-400 hover:text-indigo-600"
                >
                  + Add Point
                </button>
                <button 
                  onClick={() => onTailorExperience(exp.id, exp.description)}
                  disabled={isTailoring}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-xl hover:bg-indigo-100 transition-all"
                >
                  {isTailoring ? 'Processing...' : 'Tailor All Bullets'}
                </button>
             </div>
          </div>
        ))}

        <button 
          onClick={addExperience}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-black hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Work Section
        </button>
      </section>

      {/* Skills */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Technical Skills</h3>
          <button 
            onClick={onRefineSkills}
            disabled={isImprovingField === 'skills'}
            className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md"
          >
            {isImprovingField === 'skills' ? 'Standardizing...' : 'AI Concise Refinement'}
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {data.skills.map((skill, i) => {
            const skillKey = `skill-${skill}`;
            return (
              <div key={i} className="flex flex-col gap-2">
                <div className="group flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-indigo-300 hover:bg-white transition-all shadow-sm">
                  <input 
                    className="bg-transparent outline-none w-24" 
                    value={skill} 
                    onChange={(e) => {
                      const newSkills = [...data.skills];
                      newSkills[i] = e.target.value;
                      handleFieldChange('skills', newSkills);
                    }}
                  />
                  <button onClick={() => handleFieldChange('skills', data.skills.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
                <SuggestionGrid fieldKey={skillKey} />
              </div>
            );
          })}
          <button onClick={() => handleFieldChange('skills', [...data.skills, 'New Skill'])} className="px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-300 hover:border-indigo-200 hover:text-indigo-500 transition-all text-xs font-bold">+ New Skill</button>
        </div>
      </section>
    </div>
  );
};
