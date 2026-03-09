import React, { useEffect, useRef, useState } from 'react';
import OvenPlayer from 'ovenplayer';
import Hls from 'hls.js';

// Ensure Hls is available globally for OvenPlayer
if (typeof window !== 'undefined') {
  (window as any).Hls = Hls;
}

import { StreamStatus, WithholdStatus } from '../utils/ebs';

interface PlayerProps {
  station: string;
  isValidating: boolean;
  status: StreamStatus;
  witholdStatus: WithholdStatus;
  sources: {
    label: string;
    file: string;
    type: 'hls' | 'webrtc' | 'dash';
    default?: boolean;
  }[];
}

const Player: React.FC<PlayerProps> = ({ station, isValidating, status, witholdStatus, sources }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isLive = status === StreamStatus.Live;
  const isStarting = status === StreamStatus.Starting;
  const isWithheld = witholdStatus !== WithholdStatus.None;

  // Reset error state when sources or station change
  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
  }, [sources, station]);

  const createPlayer = () => {
    if (!playerRef.current || sources.length === 0 || !isLive) return;

    if (playerInstance.current) {
      playerInstance.current.remove();
    }

    const displayStation = station.charAt(0).toUpperCase() + station.slice(1);

    console.log(`[Player] Creating OvenPlayer for ${station} with ${sources.length} sources`);

    playerInstance.current = OvenPlayer.create('oven-player-container', {
      title: `EBS - ${displayStation}`,
      autoStart: true,
      playbackRates: [],
      sources: sources,
      preload: 'auto',
      hlsConfig: {
        liveSyncDuration: 6,
        liveMaxLatencyDuration: 12,
        maxLiveSyncPlaybackRate: 1.5,
        enableWorker: true,
        lowLatencyMode: true
      }
    });

    playerInstance.current.on('ready', () => {
      console.log('[Player] OvenPlayer Ready');
      setHasError(false);
    });

    playerInstance.current.on('error', (error: any) => {
      console.error('[Player] OvenPlayer error:', error);
      setHasError(true);

      // Auto-refresh logic: Try to re-create player on error up to 3 times
      if (retryCount < 3) {
        console.log(`[Player] Attempting reconnection (${retryCount + 1}/3)...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          createPlayer();
        }, 3000);
      }
    });

    // Check for "stuck" playback
    playerInstance.current.on('buffer', (info: any) => {
      if (info.type === 'stale') {
        console.warn('[Player] Stale buffer detected, refreshing...');
        createPlayer();
      }
    });
  };

  useEffect(() => {
    if (!isValidating && isLive && sources.length > 0 && playerRef.current) {
      createPlayer();
    }

    return () => {
      if (playerInstance.current) {
        playerInstance.current.remove();
        playerInstance.current = null;
      }
    };
  }, [isValidating, isLive, sources, station]);

  const getStatusLabel = () => {
    if (isWithheld) return 'Withheld';
    if (isLive) return 'Live';
    if (isStarting) return 'Starting';
    return 'Offline';
  };

  const getErrorMessage = () => {
    if (isWithheld) {
      switch (witholdStatus) {
        case WithholdStatus.Legal: return "This stream has been withheld for legal reasons.";
        case WithholdStatus.Policy: return "This stream is withheld due to policy restrictions.";
        case WithholdStatus.Issues: return "This stream is temporarily withheld due to technical issues.";
        default: return "This stream is currently withheld.";
      }
    }
    if (isStarting) return "The stream is starting and will be live in about a minute.";
    return "This station is currently offline or does not exist.";
  };

  return (
    <div className="player-frame group relative">
      {/* Status Badge */}
      {!isValidating && (
        <div className={`status-badge ${(isLive && !hasError) ? 'badge-live' : (isStarting ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 border-amber-500/20 dark:border-amber-500/30' : 'badge-offline')}`}>
          <span className={`status-dot ${(isLive && !hasError) ? 'animate-pulse-glow' : (isStarting ? 'bg-amber-500 animate-pulse' : '')}`}></span>
          {getStatusLabel()}
        </div>
      )}

      {isValidating ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-200/20 dark:bg-black/40 rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-400/20 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-slate-600 dark:text-white/60 font-medium animate-pulse">Initializing Stream...</p>
          </div>
        </div>
      ) : (!isLive || hasError || isWithheld) ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-200/20 dark:bg-black/40 rounded-xl">
          <div className="text-center px-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${isStarting ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
              <svg className={`w-10 h-10 ${isStarting ? 'text-amber-500' : 'text-rose-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {hasError ? 'Connection Error' : (isWithheld ? 'Stream Withheld' : (isStarting ? 'Starting Soon' : 'Stream Unavailable'))}
            </h3>
            <p className="text-slate-500 dark:text-white/60">
              {hasError
                ? 'The connection was lost. We are attempting to reconnect...'
                : getErrorMessage()}
            </p>
            {hasError && (
              <button
                onClick={() => createPlayer()}
                className="mt-6 px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-teal-500/20"
              >
                Reconnect Now
              </button>
            )}
          </div>
        </div>
      ) : (
        <div 
          key={`${station}-${sources.map(s => s.file).join(',')}`}
          id="oven-player-container" 
          ref={playerRef} 
          className="w-full h-full" 
        />
      )}
    </div>
  );
};

export default Player;
