import { Lightbulb, ChevronDown, Radio } from 'lucide-react';
import { StreamStatus } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';

interface StatusDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  currentStream: StreamEntry | null;
  region: string;
  isRegionOpen: boolean;
  onRegionToggle: (e: React.MouseEvent) => void;
  onRegionSelect: (region: string) => void;
}

const StatusDropdown = ({
  isOpen,
  onToggle,
  currentStream,
  region,
  isRegionOpen,
  onRegionToggle,
  onRegionSelect
}: StatusDropdownProps) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`theme-toggle flex items-center gap-2 px-4 transition-all duration-300 h-11 ${isOpen ? 'bg-slate-200 dark:bg-white/10' : ''}`}
        title="Stream Status"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Lightbulb className={`w-5 h-5 transition-all duration-300 ${currentStream?.status === StreamStatus.Live ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
          currentStream?.status === StreamStatus.Starting ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
            'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
          }`} />
        <span className="hidden sm:inline font-semibold text-sm text-slate-700 dark:text-white">Status</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
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

              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500/60 dark:text-slate-500 tracking-widest pl-1">Region</span>
                  <div className="relative">
                    <button
                      onClick={onRegionToggle}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-teal-500" />
                        <span>{region}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isRegionOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isRegionOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-[110] animate-fade-in-slide-up">
                        <button
                          onClick={() => onRegionSelect('Default')}
                          className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                          <span>Default</span>
                          {region === 'Default' && <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDropdown;
