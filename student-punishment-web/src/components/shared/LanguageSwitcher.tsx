import { useLanguageStore, type Language } from '../../stores/languageStore'

interface LanguageSwitcherProps {
  className?: string
  variant?: 'pill' | 'compact'
}

export default function LanguageSwitcher({ className = '', variant = 'pill' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguageStore()

  const handleSelect = (lang: Language) => {
    if (language !== lang) {
      setLanguage(lang)
    }
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => handleSelect(language === 'en' ? 'id' : 'en')}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
          className || 'bg-white/10 hover:bg-white/20 text-white border-white/20'
        }`}
        title={language === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
      >
        <span>🌐</span>
        <span className="uppercase tracking-wider">{language}</span>
      </button>
    )
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold select-none ${className}`}
      role="group"
      aria-label="Language Switcher"
    >
      <button
        type="button"
        onClick={() => handleSelect('en')}
        className={`px-2.5 py-1 rounded-lg transition-all duration-150 flex items-center gap-1 ${
          language === 'en'
            ? 'bg-white text-primary-700 shadow-xs font-bold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
      <button
        type="button"
        onClick={() => handleSelect('id')}
        className={`px-2.5 py-1 rounded-lg transition-all duration-150 flex items-center gap-1 ${
          language === 'id'
            ? 'bg-white text-primary-700 shadow-xs font-bold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title="Bahasa Indonesia"
      >
        <span>🇮🇩</span>
        <span>ID</span>
      </button>
    </div>
  )
}

