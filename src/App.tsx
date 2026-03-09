import { useState, useEffect } from 'react';
import { Moon, Sun, Activity, Lightbulb, ChevronDown, RectangleHorizontal, Radio } from 'lucide-react';
import Player from './components/Player';
import { ebsApi, StreamStatus, WithholdStatus, STREAM_BASE_URL } from './utils/ebs';
import type { StreamEntry } from './utils/ebs';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [isTheater, setIsTheater] = useState(false);

  const [station, setStation] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('station') || 'test';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [availableStreams, setAvailableStreams] = useState<StreamEntry[]>([]);
  const [currentStream, setCurrentStream] = useState<StreamEntry | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isStreamSelectionOpen, setIsStreamSelectionOpen] = useState(false);
  const [expandedStationId, setExpandedStationId] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isValidatingSources, setIsValidatingSources] = useState(false);

  useEffect(() => {
    const fetchStreams = async () => {
      setIsLoading(true);
      const streams = await ebsApi.getStreams();
      setAvailableStreams(streams);

      // Find stream matching station or default to first one if station not found
      const match = streams.find((s: StreamEntry) => s.station.toLowerCase() === station.toLowerCase());
      if (match) {
        setCurrentStream(match);
      } else if (streams.length > 0 && station === 'test') {
        // If we are on 'test' but it's not live, maybe pick the first available
        setCurrentStream(streams[0]);
        setStation(streams[0].station);
      } else {
        setCurrentStream(null);
      }

      setIsLoading(false);
    };

    fetchStreams();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStreams, 30000);
    return () => clearInterval(interval);
  }, [station]);

  useEffect(() => {
    const validateSources = async () => {
      // If we already have sources from the API, use them
      if (currentStream?.sources && currentStream.sources.length > 0) {
        setSources(currentStream.sources);
        setIsValidatingSources(false);
        return;
      }

      setIsValidatingSources(true);

      // If we already have sources for this station and they aren't empty, 
      // we might have already validated. 
      if (sources.length > 0 && !currentStream?.sources?.length) {
        setIsValidatingSources(false);
        return;
      }

      const baseUrl = STREAM_BASE_URL.endsWith('/') ? STREAM_BASE_URL : `${STREAM_BASE_URL}/`;
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
              type: 'hls' as const,
              file: src.file,
              default: src.default
            });
          } else if (response.status === 404) {
            console.log(`[Validation] Source ${src.label} explicitly return 404 - skipping.`);
          }
        } catch (error) {
          // Step 2: Fallback to no-cors if blocked by security policies
          try {
            const fallback = await fetch(src.file, { method: 'HEAD', mode: 'no-cors' });
            if (fallback.type === 'opaque') {
              console.log(`[Validation] Source ${src.label} blocked by CORS - using best-effort validation.`);
              validated.push({
                label: src.label,
                type: 'hls' as const,
                file: src.file,
                default: src.default
              });
            }
          } catch (fallbackError) {
            console.warn(`[Validation] Full validation failure for ${src.label}:`, fallbackError);
          }
        }
      }

      setSources(validated);
      setIsValidatingSources(false);
    };

    validateSources();
  }, [station, currentStream]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleStationChange = (newStation: string) => {
    setStation(newStation);
    const newParams = new URLSearchParams(window.location.search);
    newParams.set('station', newStation);
    window.history.pushState({}, '', `?${newParams.toString()}`);
    setIsStreamSelectionOpen(false);
  };

  return (
    <div className={`app-root ${isTheater ? 'theater-mode' : ''}`}>
      <header className="premium-header">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="premium-logo-box">
            <img src="/unicorse.webp" alt="EBS Logo" className="w-8 h-8 rounded-md" />
          </div>
          <div className="flex flex-col items-start translate-y-[-1px]">
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 dark:from-white dark:via-teal-200 dark:to-slate-300">
              Equestrian Broadcast Service
            </h1>
            <div className="status-indicator">
              <Activity className={`w-3 h-3 mr-1 ${(currentStream && currentStream.status === StreamStatus.Live) ? 'text-emerald-500 animate-pulse' :
                (currentStream && currentStream.status === StreamStatus.Starting) ? 'text-amber-500 animate-pulse' :
                  'text-rose-500'
                }`} />
              {currentStream ? (
                <>
                  <span className={`font-bold ${(currentStream.status === StreamStatus.Live) ? 'text-emerald-500' :
                    (currentStream.status === StreamStatus.Starting) ? 'text-amber-500' :
                      'text-slate-500'
                    }`}>
                    {currentStream.status === StreamStatus.Live ? 'LIVE' : currentStream.status === StreamStatus.Starting ? 'STARTING' : 'OFFLINE'}:
                  </span>
                  <span className="ml-1 uppercase text-slate-700 dark:text-slate-300 font-bold">{currentStream.name}</span>
                </>
              ) : (
                <span className="text-rose-500 font-bold">STATION NOT FOUND</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative flex-shrink-0">
          {/* Station Selection Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsStreamSelectionOpen(!isStreamSelectionOpen);
                setIsStatusOpen(false);
              }}
              className={`theme-toggle flex items-center gap-2 px-4 transition-all duration-300 h-11 ${isStreamSelectionOpen ? 'bg-slate-200 dark:bg-white/10' : ''}`}
              title="Select Station"
            >
              <Radio className={`w-5 h-5 ${isStreamSelectionOpen ? 'text-teal-500' : 'text-slate-700 dark:text-slate-300'}`} />
              <span className="hidden sm:inline font-semibold text-sm text-slate-700 dark:text-white">Stations</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isStreamSelectionOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStreamSelectionOpen && (
              <div className="premium-dropdown">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Select Station</span>
                    <Radio className="w-4 h-4 text-teal-500" />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {availableStreams.length > 0 ? (
                      availableStreams
                        .filter(s => (s.witholdStatus ?? 0) === 0)
                        .map((s) => (
                          <div key={s.id} className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStationChange(s.station)}
                                className={`flex-1 flex items-center justify-between p-3 rounded-xl transition-all ${s.station === station
                                  ? 'bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${s.status === StreamStatus.Live ? 'bg-emerald-500 animate-pulse' :
                                    s.status === StreamStatus.Starting ? 'bg-amber-500 animate-pulse' :
                                      s.status === StreamStatus.Offline ? 'bg-rose-500 animate-pulse' :
                                        'bg-slate-400'
                                    }`} />
                                  <span className="font-semibold text-sm">{s.name}</span>
                                </div>
                                {s.viewers !== undefined && (
                                  <span className="text-[10px] bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                    {s.viewers}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedStationId(expandedStationId === s.id ? null : s.id);
                                }}
                                className={`p-3 rounded-xl transition-all ${expandedStationId === s.id
                                  ? 'bg-slate-200 dark:bg-white/15 text-teal-500'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400'
                                  }`}
                                title="Station Info"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedStationId === s.id ? 'rotate-180' : ''}`} />
                              </button>
                            </div>

                            {expandedStationId === s.id && s.dates && (
                              <div className="mx-2 p-3 bg-slate-100/50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 space-y-2 animate-fade-in-slide-down">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <span>Stream Period</span>
                                    <Activity className="w-3 h-3" />
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-slate-400 uppercase font-medium">Starts</span>
                                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {new Date(s.dates.startAt).toLocaleString(undefined, {
                                          dateStyle: 'medium',
                                          timeStyle: 'short'
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-slate-400 uppercase font-medium">Ends</span>
                                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {new Date(s.dates.endAt).toLocaleString(undefined, {
                                          dateStyle: 'medium',
                                          timeStyle: 'short'
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm italic">
                        No live stations available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsStreamSelectionOpen(false);
              }}
              className={`theme-toggle flex items-center gap-2 px-4 transition-all duration-300 h-11 ${isStatusOpen ? 'bg-slate-200 dark:bg-white/10' : ''}`}
              title="Stream Status"
            >
              <Lightbulb className={`w-5 h-5 transition-all duration-300 ${currentStream?.status === StreamStatus.Live ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                currentStream?.status === StreamStatus.Starting ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                  'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                }`} />
              <span className="hidden sm:inline font-semibold text-sm text-slate-700 dark:text-white">Status</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusOpen && (
              <div className="premium-dropdown">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                    <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Stream Info</span>
                    <div className={`status-badge relative !static !p-0 !border-0 flex items-center font-bold text-xs ${currentStream?.status === StreamStatus.Live ? 'text-emerald-500' :
                      currentStream?.status === StreamStatus.Starting ? 'text-amber-500' :
                        'text-rose-500'
                      }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${currentStream?.status === StreamStatus.Live ? 'bg-emerald-500 animate-pulse-glow' :
                        currentStream?.status === StreamStatus.Starting ? 'bg-amber-500 animate-pulse' :
                          'bg-rose-500'
                        }`}></div>
                      {currentStream?.status === StreamStatus.Live ? 'LIVE' : currentStream?.status === StreamStatus.Starting ? 'STARTING' : 'OFFLINE'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 pl-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500/60 dark:text-slate-500 tracking-widest">Currently Playing</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentStream?.name || 'Nothing'}</span>
                    </div>

                    {currentStream?.viewers !== undefined && (
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500/60 dark:text-slate-500 tracking-widest">Active Viewers</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentStream.viewers}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
                        Quality is automatically optimized for your connection.
                      </p>
                    </div>
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
              <RectangleHorizontal className="w-5 h-5 text-teal-500 fill-teal-500/20" />
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
              <Moon className="w-5 h-5 text-teal-400 icon-moon" />
            )}
          </button>
        </div>
      </header>

      <main className={`flex-1 flex items-center justify-center min-h-0 ${isTheater ? 'w-full' : ''}`}>
        <div className={isTheater ? 'w-full' : 'max-w-5xl w-full'}>
          <Player
            station={station}
            isValidating={isLoading || isValidatingSources}
            status={currentStream?.status ?? StreamStatus.Offline}
            witholdStatus={currentStream?.witholdStatus ?? WithholdStatus.None}
            sources={sources}
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
