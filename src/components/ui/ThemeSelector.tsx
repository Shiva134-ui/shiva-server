import { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';

export type AccentColor = 'white' | 'emerald' | 'cyan' | 'blue' | 'purple' | 'amber';

export default function ThemeSelector() {
  const [accent, setAccent] = useState<AccentColor>('white');
  const [isOled, setIsOled] = useState(true);

  useEffect(() => {
    const savedAccent = (localStorage.getItem('madesh_accent') as AccentColor) || 'white';
    const savedOled = localStorage.getItem('madesh_oled');
    const oledEnabled = savedOled === null ? true : savedOled === 'true';

    setAccent(savedAccent);
    setIsOled(oledEnabled);

    document.documentElement.setAttribute('data-accent', savedAccent);
    if (oledEnabled) {
      document.documentElement.classList.add('oled-theme');
    } else {
      document.documentElement.classList.remove('oled-theme');
    }
  }, []);

  const changeAccent = (color: AccentColor) => {
    setAccent(color);
    localStorage.setItem('madesh_accent', color);
    document.documentElement.setAttribute('data-accent', color);
  };

  const toggleOled = () => {
    const next = !isOled;
    setIsOled(next);
    localStorage.setItem('madesh_oled', String(next));
    if (next) {
      document.documentElement.classList.add('oled-theme');
    } else {
      document.documentElement.classList.remove('oled-theme');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* OLED Black Toggle */}
      <button
        onClick={toggleOled}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
          isOled 
            ? 'bg-white text-black border-white' 
            : 'bg-[#18181b] text-neutral-400 border-[#27272a] hover:text-white'
        }`}
        title={isOled ? 'OLED Pitch Black (#000) Active' : 'Charcoal Dark Active'}
      >
        <Moon className="w-3.5 h-3.5" />
        <span>{isOled ? 'OLED' : 'Dark'}</span>
      </button>

      {/* Accent Dots */}
      <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] p-1 rounded-lg">
        {[
          { id: 'white', class: 'bg-white' },
          { id: 'emerald', class: 'bg-emerald-400' },
          { id: 'cyan', class: 'bg-cyan-400' },
          { id: 'blue', class: 'bg-blue-400' },
          { id: 'purple', class: 'bg-purple-400' },
          { id: 'amber', class: 'bg-amber-400' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => changeAccent(item.id as AccentColor)}
            className={`w-4 h-4 rounded-full ${item.class} flex items-center justify-center transition-transform ${
              accent === item.id ? 'scale-110 ring-2 ring-white/50' : 'opacity-60 hover:opacity-100'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
