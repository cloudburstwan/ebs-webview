import { Activity, RectangleHorizontal, Sun, Moon } from 'lucide-react';
import { StreamStatus } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';

interface HeaderProps {
    currentStream: StreamEntry | null;
    isTheater: boolean;
    onTheaterToggle: () => void;
    isDark: boolean;
    onDarkToggle: () => void;
    children: React.ReactNode;
}

const Header = ({
    currentStream,
    isTheater,
    onTheaterToggle,
    isDark,
    onDarkToggle,
    children
}: HeaderProps) => {
    return (
        <header className="premium-header">
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="premium-logo-box">
                    <img src="/unicorse.webp" alt="EBS Logo" className="w-8 h-8 rounded-md" />
                </div>
                <div className="flex flex-col items-start translate-y-[-1px]">
                    <h1 className="text-xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400">
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
                {children}

                <button
                    onClick={onTheaterToggle}
                    className="theme-toggle"
                    title={isTheater ? "Exit Theater Mode" : "Theater Mode"}
                    aria-label={isTheater ? "Exit Theater Mode" : "Theater Mode"}
                >
                    {isTheater ? (
                        <RectangleHorizontal className="w-5 h-5 text-teal-500 fill-teal-500/20" />
                    ) : (
                        <RectangleHorizontal className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    )}
                </button>

                <button
                    onClick={onDarkToggle}
                    className="theme-toggle"
                    title="Toggle Theme"
                    aria-label="Toggle Theme"
                >
                    {isDark ? (
                        <Sun className="w-5 h-5 text-amber-400 icon-sun" />
                    ) : (
                        <Moon className="w-5 h-5 text-teal-400 icon-moon" />
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;
