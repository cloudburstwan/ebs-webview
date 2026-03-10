import { useEffect, useRef, useState } from 'react';
import OvenPlayer from 'ovenplayer';
import Hls from 'hls.js';

// Ensure Hls is available globally for OvenPlayer
if (typeof window !== 'undefined') {
  (window as any).Hls = Hls;
}

import { StreamStatus, WithholdStatus } from '../utils/ebs';
import { PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE, PLAYER_LIVE_SYNC_DURATION } from '../utils/env';

interface PlayerProps {
  stream: string;
  isValidating: boolean;
  status: StreamStatus;
  witholdStatus: WithholdStatus;
  sources: {
    label: string;
    file: string;
    type: 'hls' | 'webrtc' | 'dash';
    default?: boolean;
  }[];
  selectedQuality?: string | null;
}

const Player = ({ stream, isValidating, status, witholdStatus, sources, selectedQuality }: PlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isLive = status === StreamStatus.Live;
  const isStarting = status === StreamStatus.Starting;
  const isWithheld = witholdStatus !== WithholdStatus.None;

  // Reset error state when sources or stream change
  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
  }, [sources, stream]);

  const createPlayer = () => {
    if (!playerRef.current || sources.length === 0 || !isLive || isWithheld) return;

    if (playerInstance.current) {
      playerInstance.current.remove();
    }

    const displayStream = stream.charAt(0).toUpperCase() + stream.slice(1);

    console.log(`[Player] Creating OvenPlayer for ${stream} with ${sources.length} sources`);

    playerInstance.current = OvenPlayer.create('oven-player-container', {
      title: `EBS - ${displayStream}`,
      autoStart: true,
      playbackRates: [],
      sources: sources,
      preload: 'auto',
      hlsConfig: {
        liveSyncDuration: PLAYER_LIVE_SYNC_DURATION,
        liveMaxLatencyDuration: PLAYER_LIVE_SYNC_DURATION * 2,
        maxLiveSyncPlaybackRate: PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE,
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
    // If withheld or not live, and player exists, remove it
    if ((isWithheld || !isLive) && playerInstance.current) {
      console.log('[Player] Removing player due to withheld/offline status');
      playerInstance.current.remove();
      playerInstance.current = null;
      return;
    }

    if (isLive && !isWithheld && sources.length > 0 && playerRef.current && !playerInstance.current) {
      createPlayer();
    }
    
    // Manual Quality Change: Force re-creation if selectedQuality changes
    // This ensures OvenPlayer definitely switches to the new discrete HLS file
    if (playerInstance.current && selectedQuality) {
      console.log(`[Player] Manual quality change to ${selectedQuality}, forcing refresh`);
      createPlayer();
    }
    
    // Cleanup on unmount or stream change
    return () => {
      // Note: We don't remove if just sources change (handled by effect below)
    };
  }, [isLive, isWithheld, stream, sources.length, selectedQuality]); // Added selectedQuality

  // Efficient Source/Quality Switching
  useEffect(() => {
    if (playerInstance.current && isLive && sources.length > 0) {
      console.log(`[Player] Updating sources via load() for ${stream}`);
      playerInstance.current.load(sources);
    }
  }, [sources]);

  // Handle unmount specifically
  useEffect(() => {
    return () => {
      if (playerInstance.current) {
        console.log('[Player] Cleaning up OvenPlayer instance');
        playerInstance.current.remove();
        playerInstance.current = null;
      }
    };
  }, []);

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
    return "This stream is currently offline or does not exist.";
  };

  return (
    <div className="player-frame group relative overflow-hidden" role="application" aria-label={`Video player for ${stream}`}>
      {/* Layer 1: The Player Instance (Background) */}
      <div className="absolute inset-0 z-0 bg-black">
        <div 
          id="oven-player-container" 
          ref={playerRef} 
          className={`w-full h-full transition-opacity duration-500 ${(!isValidating && isLive && !hasError && !isWithheld) ? 'opacity-100 flex' : 'opacity-0'}`}
        />
      </div>

      {/* Layer 2: UI Overlay Layer (Foreground) */}
      <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center transition-colors duration-300 ${(!isLive || hasError || isWithheld || isValidating) ? 'bg-slate-200/20 dark:bg-black/40' : ''}`}>
        
        {/* Status Badge (Stays in top-right) */}
        {!isValidating && (
          <div 
            className={`absolute top-4 right-4 z-20 pointer-events-auto status-badge cursor-pointer ${(isLive && !hasError) ? 'badge-live active:scale-95 transition-transform' : (isStarting ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 border-amber-500/20 dark:border-amber-500/30' : 'badge-offline')}`}
            onClick={() => {
              if (isLive && !hasError && playerInstance.current) {
                const duration = playerInstance.current.getDuration();
                playerInstance.current.seek(duration);
              }
            }}
            title={isLive ? "Click to sync to live edge" : undefined}
          >
            <span className={`status-dot ${(isLive && !hasError) ? 'animate-pulse-glow' : (isStarting ? 'bg-amber-500 animate-pulse' : '')}`}></span>
            {getStatusLabel()}
          </div>
        )}

        {isValidating ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-400/20 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-slate-600 dark:text-white/60 font-medium animate-pulse">Initializing Stream...</p>
          </div>
        ) : (!isLive || hasError || isWithheld) ? (
          <div className="text-center px-6 pointer-events-auto">
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
        ) : null}
      </div>
    </div>
  );
};

export default Player;
