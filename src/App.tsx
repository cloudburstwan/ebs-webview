import { useState, useEffect } from 'react';
import { Moon, Sun, Maximize2, Minimize2, Activity } from 'lucide-react';
import Player from './components/Player';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [isTheater, setIsTheater] = useState(false);
  const baseUrl = import.meta.env.VITE_STREAM_BASE_URL || 'https://stream.equestria.horse/s/';
  
  const [station] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('station') || 'test';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className={`app-root ${isTheater ? 'theater-mode' : ''}`}>
      <header className="premium-header">
        <div className="flex items-center gap-3">
          <div className="premium-logo-box p-1">
            <img src="/ebs_icon.png" alt="EBS Logo" className="w-8 h-8 rounded-md" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Equestrian Broadcast Service
            </h1>
            <div className="status-indicator">
              <Activity className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-500 animate-pulse" />
              LIVE: <span className="ml-1 uppercase text-slate-700 dark:text-slate-300">{station}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTheater(!isTheater)}
            className="theme-toggle"
            title={isTheater ? "Exit Theater Mode" : "Theater Mode"}
          >
            {isTheater ? (
              <Minimize2 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            ) : (
              <Maximize2 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            )}
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className="theme-toggle"
            title="Toggle Theme"
          >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400 icon-sun" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-400 icon-moon" />
          )}
        </button>
        </div>
      </header>

      <main className={`flex-1 flex items-center justify-center ${isTheater ? 'w-full' : ''}`}>
        <div className={isTheater ? 'w-full' : 'max-w-5xl w-full'}>
          <Player station={station} baseUrl={baseUrl} />
        </div>
      </main>

      <footer className="premium-footer">
        <p>&copy; 2026 Equestrian Broadcast Service. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
