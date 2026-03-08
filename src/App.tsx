import { useState, useEffect } from 'react';
import { Moon, Sun, Radio, Activity } from 'lucide-react';
import Player from './components/Player';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [station, setStation] = useState('test');
  const baseUrl = import.meta.env.VITE_STREAM_BASE_URL || 'https://stream.equestria.horse/s/';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stationParam = params.get('station');
    if (stationParam) {
      setStation(stationParam);
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const streamUrl = `${baseUrl}${station}.m3u8`;

  return (
    <div className="app-root">
      <header className="premium-header">
        <div className="flex items-center space-x-3">
          <div className="premium-logo-box">
            <Radio className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Stream Webview</h1>
            <div className="status-indicator">
              <Activity className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-500 animate-pulse" />
              LIVE: <span className="ml-1 uppercase text-slate-700 dark:text-slate-300">{station}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDark(!isDark)}
          className="theme-toggle"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400 icon-sun" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-400 icon-moon" />
          )}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-5xl w-full">
          <Player source={streamUrl} />
          
          <div className="mt-6 flex flex-wrap gap-3">
             <div className="info-badge info-indigo">
               HLS Player Active
             </div>
             <div className="info-badge info-emerald">
               Low Latency Enabled
             </div>
          </div>
        </div>
      </main>

      <footer className="premium-footer">
        &copy; {new Date().getFullYear()} Equestria Horse Streaming • {station}
      </footer>
    </div>
  );
}

export default App;
