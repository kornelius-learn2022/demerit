import { useLanguageStore } from '../../stores/languageStore'

export default function ProgressiveDisciplinePlan() {
  const { language, t } = useLanguageStore()
  const plan = t().disciplinePlan

  return (
    <div className="card bg-white shadow-sm border border-slate-200/90 overflow-hidden">
      {/* 1. Main Header - Centered & Bold */}
      <div className="py-4 px-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 text-center">
        <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 uppercase">
          {plan.mainHeader}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
          {language === 'en'
            ? 'Official school behavioral guidelines, demerit thresholds & progressive consequence framework.'
            : 'Pedoman tata tertib resmi sekolah, ambang batas demerit & tahapan konsekuensi perilaku.'}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* 30-Demerit Mandatory Parent Meeting Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs sm:text-sm">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-amber-950">
              {language === 'en' ? 'Mandatory Parent Contact Milestone' : 'Aturan Wajib Hubungi Orang Tua'}
            </p>
            <p className="mt-0.5 leading-relaxed text-amber-800 text-xs">
              {plan.rule30Highlight}
            </p>
          </div>
        </div>

        {/* 2. Minor Offences Section */}
        <div className="space-y-3">
          <div className="text-center">
            <span className="font-bold text-xs uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-block">
              {plan.minorOffencesHeader}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-3 w-20 sm:w-24 shrink-0">{plan.tableMinor.demeritCol}</th>
                  <th className="py-2.5 px-3">{plan.tableMinor.consequencesCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {plan.tableMinor.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      row.isKeyMilestone
                        ? 'bg-amber-50/50 hover:bg-amber-50 font-medium'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        row.isKeyMilestone
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {row.demerit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 leading-relaxed">
                      {row.consequence}
                      {row.isKeyMilestone && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 whitespace-nowrap">
                          📞 Meet Parent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Descriptive text below Minor Offences */}
          <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 leading-relaxed">
            📌 {plan.tableMinor.accumulationNote}
          </p>
        </div>

        {/* 3. Major Offences Section */}
        <div className="space-y-3 pt-2">
          <div className="text-center">
            <span className="font-bold text-xs uppercase tracking-widest text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
              {plan.majorOffencesHeader}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-rose-200 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              {/* Light cream-pink header row as specified in the official policy */}
              <thead>
                <tr className="bg-[#fef2f2] border-b border-rose-200 text-[11px] font-bold uppercase tracking-wider text-rose-900">
                  <th className="py-2.5 px-3 w-28 sm:w-32 shrink-0">{plan.tableMajor.warningLetterCol}</th>
                  <th className="py-2.5 px-3 w-20 sm:w-24 shrink-0">{plan.tableMajor.demeritCol}</th>
                  <th className="py-2.5 px-3">{plan.tableMajor.consequencesCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 text-slate-700">
                {plan.tableMajor.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-rose-950 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                        {row.letter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {row.demerit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 leading-relaxed font-medium">
                      {row.consequence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Policy Notes Paragraphs */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
          {plan.policyNotes.map((note, idx) => (
            <p key={idx} className="flex items-start gap-1.5 leading-relaxed">
              <span className="text-slate-400 font-bold shrink-0">•</span>
              <span>{note}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

