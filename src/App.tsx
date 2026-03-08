import { useState, useEffect } from 'react';
import { Moon, Sun, Activity, Lightbulb, ChevronDown, RectangleHorizontal } from 'lucide-react';
import Player from './components/Player';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [isTheater, setIsTheater] = useState(false);
  const baseUrl = import.meta.env.VITE_STREAM_BASE_URL || 'https://stream.equestria.horse/s/';
  
  const [station] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('station') || 'test';
  });

  const [isValidating, setIsValidating] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState(0);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  useEffect(() => {
    const validateSources = async () => {
      setIsValidating(true);
      const potentialSources = [
        { label: '1080p', file: `${baseUrl}${station}-1080p.m3u8` },
        { label: '720p', file: `${baseUrl}${station}-720p.m3u8` },
        { label: '360p', file: `${baseUrl}${station}-360p.m3u8` },
        { label: 'Direct', file: `${baseUrl}${station}.m3u8`, default: true }
      ];

      const validated = [];
      for (const src of potentialSources) {
        try {
          // Step 1: Try a regular fetch to read status code (works if CORS is enabled)
          const response = await fetch(src.file, { method: 'HEAD' });
          if (response.ok) {
            validated.push({
              label: src.label,
              type: 'hls',
              file: src.file,
              default: src.default
            });
          } else if (response.status === 404) {
            console.log(`Source ${src.label} explicitly return 404 - skipping.`);
          }
        } catch (error) {
          // Step 2: Fallback to no-cors if blocked by security policies
          try {
            const fallback = await fetch(src.file, { method: 'HEAD', mode: 'no-cors' });
            if (fallback.type === 'opaque') {
              console.log(`Source ${src.label} blocked by CORS - using best-effort validation.`);
              validated.push({
                label: src.label,
                type: 'hls',
                file: src.file,
                default: src.default
              });
            }
          } catch (fallbackError) {
            console.warn(`Full validation failure for ${src.label}:`, fallbackError);
          }
        }
      }

      setSources(validated);
      const defaultIdx = validated.findIndex(s => s.default);
      setCurrentQualityIndex(defaultIdx !== -1 ? defaultIdx : 0);
      setIsLive(validated.length > 0);
      setIsValidating(false);
    };

    validateSources();
  }, [station, baseUrl]);

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
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className={`theme-toggle flex items-center gap-2 px-4 transition-all duration-300 ${isStatusOpen ? 'bg-slate-200 dark:bg-white/10' : ''}`}
              title="Stream Status"
            >
              <Lightbulb className={`w-5 h-5 transition-all duration-300 ${isLive ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
              <span className="hidden sm:inline font-semibold text-sm text-slate-700 dark:text-white">Status</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusOpen && (
              <div className="premium-dropdown">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                    <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Stream Status</span>
                    <div className={`status-badge relative !static !p-0 !border-0 flex items-center font-bold text-xs ${isLive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-emerald-500 animate-pulse-glow' : 'bg-rose-500'}`}></div>
                      {isLive ? 'LIVE' : 'OFFLINE'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500/60 dark:text-slate-500 tracking-widest pl-1">Available Qualities</span>
                    {isValidating ? (
                      <div className="py-2 flex items-center gap-2 text-slate-400 italic text-xs">
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                        Checking sources...
                      </div>
                    ) : sources.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {sources.map((src, index) => {
                          const isActive = index === currentQualityIndex;
                          return (
                            <button 
                              key={src.label} 
                              onClick={() => setCurrentQualityIndex(index)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border text-xs font-medium 
                                ${isActive 
                                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-400' 
                                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`}></div>
                              {src.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-2 text-rose-500 text-xs font-medium pl-1">No sources found</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsTheater(!isTheater)}
            className="theme-toggle"
            title={isTheater ? "Exit Theater Mode" : "Theater Mode"}
          >
            {isTheater ? (
              <RectangleHorizontal className="w-5 h-5 text-indigo-500 fill-indigo-500/20" />
            ) : (
              <RectangleHorizontal className="w-5 h-5 text-slate-700 dark:text-slate-300" />
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
          <Player 
            station={station} 
            baseUrl={baseUrl} 
            isValidating={isValidating}
            isLive={isLive}
            sources={sources}
            currentQualityIndex={currentQualityIndex}
          />
        </div>
      </main>

      <footer className="premium-footer">
        <p>&copy; 2026 Equestrian Broadcast Service. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
