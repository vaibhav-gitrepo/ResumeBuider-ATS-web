
import React, { useRef } from 'react';
import { ResumeData, Experience, ImprovementSuggestion, Education } from '../types';

interface Props {
  data: ResumeData;
  tailoredBullets: Record<string, any>;
  fieldSuggestions: Record<string, ImprovementSuggestion[]>;
  onUpdate: (data: ResumeData) => void;
  onTailorExperience: (expId: string, bullets: string[]) => void;
  onImproveField: (fieldName: string, content: string, keyOverride?: string) => void;
  onClearSuggestions?: (key: string) => void;
  isTailoring: boolean;
  isImprovingField: string | null;
}

export const ResumeEditor: React.FC<Props> = ({ 
  data, 
  fieldSuggestions,
  onUpdate, 
  onTailorExperience, 
  onImproveField,
  onClearSuggestions,
  isTailoring,
  isImprovingField
}) => {
  const originalValues = useRef<Record<string, any>>({});

  const handleFieldChange = (field: keyof ResumeData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleExperienceChange = (id: string, field: keyof Experience, value: any) => {
    const newExperience = data.experience.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    onUpdate({ ...data, experience: newExperience });
  };

  const removeExperience = (id: string) => {
    if (confirm("Delete this experience entry?")) {
      onUpdate({ ...data, experience: data.experience.filter(exp => exp.id !== id) });
    }
  };

  const removeEducation = (id: string) => {
    if (confirm("Delete this education entry?")) {
      onUpdate({ ...data, education: data.education.filter(edu => edu.id !== id) });
    }
  };

  const handleEducationChange = (id: string, field: keyof Education, value: string) => {
    const newEducation = data.education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    );
    onUpdate({ ...data, education: newEducation });
  };

  const applySuggestion = (fieldKey: string, suggestedValue: string) => {
    // Capture original state for revert functionality
    if (!originalValues.current[fieldKey]) {
      if (fieldKey === 'summary') {
        originalValues.current[fieldKey] = data.summary;
      } else if (fieldKey === 'skills') {
        originalValues.current[fieldKey] = [...data.skills];
      } else if (fieldKey === 'education') {
        originalValues.current[fieldKey] = JSON.parse(JSON.stringify(data.education));
      } else if (fieldKey === 'experience-global') {
        originalValues.current[fieldKey] = JSON.parse(JSON.stringify(data.experience));
      } else if (fieldKey.startsWith('exp-entry-')) {
        const expId = fieldKey.replace('exp-entry-', '');
        const entry = data.experience.find(e => e.id === expId);
        if (entry) originalValues.current[fieldKey] = JSON.parse(JSON.stringify(entry));
      } else if (fieldKey.startsWith('bullet-')) {
        const [_, expId, idxStr] = fieldKey.split('-');
        const exp = data.experience.find(e => e.id === expId);
        if (exp) originalValues.current[fieldKey] = exp.description[parseInt(idxStr)];
      }
    }

    // Process and Apply the suggestion
    if (fieldKey === 'summary') {
      handleFieldChange('summary', suggestedValue);
    } else if (fieldKey === 'skills') {
      const skillsArray = suggestedValue.split(/[,\n]/).map(s => s.trim().replace(/^[-•]\s*/, '')).filter(s => s !== "");
      handleFieldChange('skills', skillsArray);
    } else if (fieldKey.startsWith('bullet-')) {
      // Individual bullet update
      const [_, expId, idxStr] = fieldKey.split('-');
      const idx = parseInt(idxStr);
      const exp = data.experience.find(e => e.id === expId);
      if (exp) {
        const newDesc = [...exp.description];
        newDesc[idx] = suggestedValue;
        handleExperienceChange(expId, 'description', newDesc);
      }
    } else if (fieldKey.startsWith('exp-entry-')) {
      // Batch entry update: Split multi-line suggestions into a new list of bullets
      const expId = fieldKey.replace('exp-entry-', '');
      const cleanBullets = suggestedValue
        .split('\n')
        .map(line => line.trim().replace(/^[-•*]\s*/, ''))
        .filter(line => line.length > 0);
      
      if (cleanBullets.length > 0) {
        handleExperienceChange(expId, 'description', cleanBullets);
      }
    }

    // Keep workspace clean: Collapse the suggestions after choice is applied
    if (onClearSuggestions) {
      onClearSuggestions(fieldKey);
    }
  };

  const revertField = (fieldKey: string) => {
    const original = originalValues.current[fieldKey];
    if (original === undefined) return;

    if (fieldKey === 'summary') {
      handleFieldChange('summary', original);
    } else if (fieldKey === 'skills') {
      handleFieldChange('skills', original);
    } else if (fieldKey === 'education') {
      handleFieldChange('education', original);
    } else if (fieldKey === 'experience-global') {
      handleFieldChange('experience', original);
    } else if (fieldKey.startsWith('exp-entry-')) {
      const expId = fieldKey.replace('exp-entry-', '');
      const newExperience = data.experience.map(exp => 
        exp.id === expId ? original : exp
      );
      handleFieldChange('experience', newExperience);
    } else if (fieldKey.startsWith('bullet-')) {
      const [_, expId, idxStr] = fieldKey.split('-');
      const exp = data.experience.find(e => e.id === expId);
      if (exp) {
        const newDesc = [...exp.description];
        newDesc[parseInt(idxStr)] = original;
        handleExperienceChange(expId, 'description', newDesc);
      }
    }
    delete originalValues.current[fieldKey];
  };

  const SuggestionGrid = ({ fieldKey }: { fieldKey: string }) => {
    const suggestions = fieldSuggestions[fieldKey];
    if (!suggestions) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
        {suggestions.slice(0, 4).map((sug, idx) => (
          <div key={idx} className="flex flex-col p-5 bg-white border border-indigo-100 rounded-2xl shadow-sm hover:shadow-md transition-all ring-1 ring-slate-100 hover:ring-indigo-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                {idx === 0 ? 'Results' : idx === 1 ? 'Skill-ATS' : idx === 2 ? 'Narrative' : 'Action'}
              </span>
            </div>
            <p className="text-xs text-slate-800 font-medium leading-relaxed italic mb-4 flex-grow">"{sug.suggested}"</p>
            <div className="pt-3 border-t border-slate-50 space-y-3">
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                <strong>Reasoning:</strong> {sug.reason}
              </p>
              <button 
                onClick={() => applySuggestion(fieldKey, sug.suggested)}
                className="w-full py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-indigo-600 transition-all active:scale-95 shadow-sm"
              >
                Apply Change
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const MagicWandIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const UndoIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );

  return (
    <div className="space-y-12 bg-white p-6 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-200">
      {/* Name/Contact Header */}
      <div className="border-b border-slate-100 pb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <input 
            className="text-5xl font-black text-slate-900 w-full border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-200"
            value={data.fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            placeholder="Your Full Name"
          />
          <div className="flex flex-wrap gap-8 text-sm text-slate-500 font-medium">
            <input 
              className="border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
              value={data.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="Email Address"
            />
            <input 
              className="border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none bg-transparent"
              value={data.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="Phone Number"
            />
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-800 border-l-4 border-indigo-600 pl-4 uppercase tracking-widest">Professional Summary</h3>
            {originalValues.current['summary'] && (
              <button onClick={() => revertField('summary')} className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-100 hover:bg-amber-100 transition-all shadow-sm">
                <UndoIcon /> Revert
              </button>
            )}
          </div>
          <button 
            onClick={() => onImproveField('summary', data.summary)}
            disabled={isImprovingField === 'summary'}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {isImprovingField === 'summary' ? 'Improving...' : <><MagicWandIcon /> AI Improve Section</>}
          </button>
        </div>
        <textarea
          rows={5}
          className="w-full text-slate-700 text-sm leading-relaxed border border-slate-100 hover:border-slate-300 focus:border-indigo-400 p-6 rounded-3xl outline-none resize-none transition-all shadow-inner bg-slate-50/50 focus:bg-white"
          value={data.summary}
          onChange={(e) => handleFieldChange('summary', e.target.value)}
          placeholder="Craft a high-impact summary..."
        />
        <SuggestionGrid fieldKey="summary" />
      </section>

      {/* Experience */}
      <section className="space-y-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-800 border-l-4 border-indigo-600 pl-4 uppercase tracking-widest">Experience</h3>
            {originalValues.current['experience-global'] && (
              <button onClick={() => revertField('experience-global')} className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-100 hover:bg-amber-100 shadow-sm"><UndoIcon /> Revert All</button>
            )}
          </div>
          <button 
            onClick={() => onImproveField('experience overview', JSON.stringify(data.experience), 'experience-global')}
            disabled={isImprovingField === 'experience-global'}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {isImprovingField === 'experience-global' ? 'Analyzing...' : <><MagicWandIcon /> AI Improve Overview</>}
          </button>
        </div>
        
        <SuggestionGrid fieldKey="experience-global" />

        {data.experience.map((exp) => {
          const entryKey = `exp-entry-${exp.id}`;
          const isEntryImproving = isImprovingField === entryKey;

          return (
            <div key={exp.id} className="relative bg-slate-50/30 p-8 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-6 mb-10">
                <div className="flex-1 space-y-2">
                  <input 
                    className="font-black text-slate-900 bg-transparent outline-none w-full text-2xl placeholder:text-slate-200"
                    value={exp.role}
                    onChange={(e) => handleExperienceChange(exp.id, 'role', e.target.value)}
                    placeholder="Your Role Title"
                  />
                  <input 
                    className="text-indigo-600 text-lg font-bold bg-transparent outline-none w-full placeholder:text-indigo-100"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)}
                    placeholder="Organization / Company"
                  />
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <input 
                      className="text-xs text-slate-400 font-mono bg-white/50 px-3 py-1.5 rounded-lg border border-slate-100 outline-none text-right"
                      value={exp.period}
                      onChange={(e) => handleExperienceChange(exp.id, 'period', e.target.value)}
                      placeholder="Period"
                    />
                    <button onClick={() => removeExperience(exp.id)} className="text-slate-300 hover:text-red-500 p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onImproveField('experience achievements', exp.description.join('\n'), entryKey)}
                      disabled={isEntryImproving}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 rounded-xl shadow-sm"
                    >
                      {isEntryImproving ? '...' : <><MagicWandIcon /> AI Improve Entry</>}
                    </button>
                    {originalValues.current[entryKey] && (
                      <button onClick={() => revertField(entryKey)} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-amber-600 bg-white border border-amber-100 hover:bg-amber-50 rounded-xl shadow-sm"><UndoIcon /> Revert Entry</button>
                    )}
                  </div>
                </div>
              </div>

              <SuggestionGrid fieldKey={entryKey} />

              <ul className="space-y-12 ml-4 mt-8">
                {exp.description.map((bullet, idx) => {
                  const bulletKey = `bullet-${exp.id}-${idx}`;
                  const isBulletImproving = isImprovingField === bulletKey;

                  return (
                    <li key={idx} className="group relative pl-8">
                      <div className="absolute left-0 top-4 w-2 h-2 rounded-full bg-indigo-200 group-hover:bg-indigo-600 transition-all ring-4 ring-transparent group-hover:ring-indigo-50" />
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-4 items-start">
                          <textarea
                            rows={2}
                            className="flex-grow p-4 text-sm text-slate-700 bg-white border border-slate-100 hover:border-indigo-200 focus:border-indigo-500 rounded-2xl transition-all resize-none outline-none shadow-sm"
                            value={bullet}
                            onChange={(e) => {
                              const newDesc = [...exp.description];
                              newDesc[idx] = e.target.value;
                              handleExperienceChange(exp.id, 'description', newDesc);
                            }}
                            placeholder="Describe a key achievement..."
                          />
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button 
                              onClick={() => onImproveField('experience bullet', bullet, bulletKey)}
                              disabled={isBulletImproving || !bullet}
                              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl shadow-sm transition-all"
                            >
                              {isBulletImproving ? '...' : <><MagicWandIcon /> AI Improve Bullet</>}
                            </button>
                            {originalValues.current[bulletKey] && (
                              <button onClick={() => revertField(bulletKey)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl shadow-sm transition-all"><UndoIcon /> Undo</button>
                            )}
                            <button onClick={() => {
                                const newDesc = exp.description.filter((_, i) => i !== idx);
                                handleExperienceChange(exp.id, 'description', newDesc);
                              }} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-slate-300 hover:text-red-500 bg-white border border-slate-100 rounded-xl shadow-sm transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg> Delete
                            </button>
                          </div>
                        </div>
                        <SuggestionGrid fieldKey={bulletKey} />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between gap-4">
                <button onClick={() => {
                  const newDesc = [...exp.description, ""];
                  handleExperienceChange(exp.id, 'description', newDesc);
                }} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl active:scale-95">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Add Achievement
                </button>
                <button 
                  onClick={() => onTailorExperience(exp.id, exp.description)}
                  disabled={isTailoring || exp.description.length === 0}
                  className="flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                  {isTailoring ? 'Processing...' : <><MagicWandIcon /> Batch Tailor All Bullets</>}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Skills */}
      <section className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-800 border-l-4 border-indigo-600 pl-4 uppercase tracking-widest">Skills</h3>
            {originalValues.current['skills'] && (
              <button onClick={() => revertField('skills')} className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-100 hover:bg-amber-100 shadow-sm"><UndoIcon /> Revert</button>
            )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => onImproveField('skills', data.skills.join(', '))}
              disabled={isImprovingField === 'skills'}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg"
            >
              {isImprovingField === 'skills' ? 'Updating...' : <><MagicWandIcon /> AI Improve Section</>}
            </button>
            <button onClick={() => handleFieldChange('skills', [...data.skills, 'New Skill'])} className="text-xs font-black text-indigo-600 bg-white border border-indigo-100 px-6 py-2.5 rounded-2xl hover:bg-indigo-50 shadow-sm">+ Add Skill</button>
          </div>
        </div>

        <SuggestionGrid fieldKey="skills" />

        <div className="flex flex-wrap gap-4">
          {data.skills.map((skill, i) => (
            <div key={i} className="group flex items-center gap-3 px-5 py-2.5 bg-white text-slate-800 rounded-2xl text-sm font-bold border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all">
              <input 
                className="bg-transparent outline-none w-32 focus:w-48 transition-all"
                value={skill}
                onChange={(e) => {
                  const newSkills = [...data.skills];
                  newSkills[i] = e.target.value;
                  handleFieldChange('skills', newSkills);
                }}
              />
              <button onClick={() => handleFieldChange('skills', data.skills.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-slate-800 border-l-4 border-indigo-600 pl-4 uppercase tracking-widest">Education</h3>
            {originalValues.current['education'] && (
              <button onClick={() => revertField('education')} className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-100 hover:bg-amber-100 shadow-sm"><UndoIcon /> Revert</button>
            )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => onImproveField('education', JSON.stringify(data.education))}
              disabled={isImprovingField === 'education'}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg"
            >
              {isImprovingField === 'education' ? 'Analyzing...' : <><MagicWandIcon /> AI Improve Section</>}
            </button>
            <button onClick={() => handleFieldChange('education', [...data.education, { id: Date.now().toString(), degree: '', institution: '', year: '' }])} className="text-xs font-black text-indigo-600 bg-white border border-indigo-100 px-6 py-2.5 rounded-2xl hover:bg-indigo-50 shadow-sm">+ Add Degree</button>
          </div>
        </div>

        <SuggestionGrid fieldKey="education" />

        <div className="space-y-6">
          {data.education.map((edu) => (
            <div key={edu.id} className="relative group p-8 bg-slate-50/30 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Degree</span>
                    <input className="font-black text-slate-900 bg-transparent outline-none text-base border-b-2 border-transparent focus:border-indigo-400" value={edu.degree} onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)} placeholder="Degree" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Institution</span>
                    <input className="text-slate-600 font-bold bg-transparent outline-none text-base border-b-2 border-transparent focus:border-indigo-400" value={edu.institution} onChange={(e) => handleEducationChange(edu.id, 'institution', e.target.value)} placeholder="University" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest text-right">Year</span>
                    <input className="text-slate-500 bg-transparent outline-none text-base text-right border-b-2 border-transparent focus:border-indigo-400" value={edu.year} onChange={(e) => handleEducationChange(edu.id, 'year', e.target.value)} placeholder="YYYY" />
                  </div>
               </div>
               <button onClick={() => removeEducation(edu.id)} className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 p-3 text-slate-300 hover:text-red-500 bg-white rounded-2xl shadow-xl border border-slate-100 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
