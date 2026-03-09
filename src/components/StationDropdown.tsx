import { Radio, ChevronDown, Activity } from 'lucide-react';
import { StreamStatus } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';

interface StationDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  availableStreams: StreamEntry[];
  currentStation: string;
  onStationChange: (station: string) => void;
  expandedStationId: string | null;
  onToggleExpanded: (id: string) => void;
}

const StationDropdown = ({
  isOpen,
  onToggle,
  availableStreams,
  currentStation,
  onStationChange,
  expandedStationId,
  onToggleExpanded
}: StationDropdownProps) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`theme-toggle flex items-center gap-2 px-4 transition-all duration-300 h-11 ${isOpen ? 'bg-slate-200 dark:bg-white/10' : ''}`}
        title="Select Station"
      >
        <Radio className={`w-5 h-5 ${isOpen ? 'text-teal-500' : 'text-slate-700 dark:text-slate-300'}`} />
        <span className="hidden sm:inline font-semibold text-sm text-slate-700 dark:text-white">Stations</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
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
                          onClick={() => onStationChange(s.station)}
                          className={`flex-1 flex items-center justify-between p-3 rounded-xl transition-all ${s.station === currentStation
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
                            onToggleExpanded(s.id);
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
                          <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-200 dark:border-white/5">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <span>Status</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${s.status === StreamStatus.Live ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            </div>
                            <span className={`text-xs font-bold ${s.status === StreamStatus.Live ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {s.status === StreamStatus.Live ? 'Online' : 'Offline'}
                            </span>
                          </div>
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
  );
};

export default StationDropdown;
