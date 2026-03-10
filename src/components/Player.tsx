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
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteChange: (isMuted: boolean) => void;
}

const Player = ({ stream, isValidating, status, witholdStatus, sources, selectedQuality, volume, onVolumeChange, isMuted, onMuteChange }: PlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);
  const onVolumeChangeRef = useRef(onVolumeChange);
  const onMuteChangeRef = useRef(onMuteChange);
  const lastStreamRef = useRef(stream);
  const lastQualityRef = useRef(selectedQuality);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Keep callback ref up to date
  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
    onMuteChangeRef.current = onMuteChange;
  }, [onVolumeChange, onMuteChange]);

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

    if (typeof window !== 'undefined') {
      (window as any).OvenPlayerInstance = playerInstance.current;
    }

    playerInstance.current.on('ready', () => {
      console.log('[Player] OvenPlayer Ready');
      setHasError(false);

      // Add "Go Live" button to control bar manually since addButton is not available
      const container = playerInstance.current.getContainerElement();
      if (container) {
        const rightControls = container.querySelector('.op-right-controls');
        if (rightControls && !container.querySelector('.live-holder')) {
          const liveHolder = document.createElement('div');
          liveHolder.className = 'live-holder op-navigators op-clear';

          const button = document.createElement('button');
          button.className = 'op-button op-live-button';
          button.title = 'Go Live';
          button.setAttribute('aria-label', 'Go Live');
          // Radio/Live-like icon
          button.innerHTML = `
            <span class="op-live-text">Go Live</span>
          `;

          button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (playerInstance.current) {
              const duration = playerInstance.current.getDuration();
              console.log(`[Player] Manual Sync: Seeking to ${duration}`);
              playerInstance.current.seek(duration);
            }
          };

          liveHolder.appendChild(button);
          // Insert at the beginning of right controls (next to settings)
          rightControls.insertBefore(liveHolder, rightControls.firstChild);
        }
      }

      // Sync initial volume and mute from persistent state
      playerInstance.current.setVolume(volume);
      playerInstance.current.setMute(isMuted);
    });

    playerInstance.current.on('volume', (data: any) => {
      if (typeof data.volume === 'number' && onVolumeChangeRef.current) {
        onVolumeChangeRef.current(data.volume);
      }
    });

    // Fallback for some versions/themes
    playerInstance.current.on('volumeChanged', (data: any) => {
      if (typeof data.volume === 'number' && onVolumeChangeRef.current) {
        onVolumeChangeRef.current(data.volume);
      }
    });

    playerInstance.current.on('mute', (data: any) => {
      if (typeof data.mute === 'boolean' && onMuteChangeRef.current) {
        onMuteChangeRef.current(data.mute);
      }
    });

    playerInstance.current.on('stateChanged', () => {
      // State changed
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

  // Primary Player Lifecycle Effect
  useEffect(() => {
    // 1. Determine if we should have a player
    const shouldExist = isLive && !isWithheld && sources.length > 0 && playerRef.current;

    if (!shouldExist) {
      if (playerInstance.current) {
        console.log('[Player] Removing player instance (not needed)');
        playerInstance.current.remove();
        playerInstance.current = null;
      }
      return;
    }

    // 2. Determine if we need to full recreate or just update
    const streamChanged = lastStreamRef.current !== stream;
    const qualityChanged = lastQualityRef.current !== selectedQuality;
    const needsNewInstance = !playerInstance.current || streamChanged || qualityChanged;

    if (needsNewInstance) {
      console.log(`[Player] (Re)creating instance. Reason: ${!playerInstance.current ? 'initial' : (streamChanged ? 'stream change' : 'quality change')}`);
      createPlayer();
      lastStreamRef.current = stream;
      lastQualityRef.current = selectedQuality;
    } else {
      // 3. Otherwise, just update source/volume if instance exists
      console.log(`[Player] Updating existing instance sources for ${stream}`);
      playerInstance.current.load(sources);

      // Sync volume to current instance
      if (playerInstance.current.getVolume && playerInstance.current.getVolume() !== volume) {
        playerInstance.current.setVolume(volume);
      }
      if (playerInstance.current.getMute && playerInstance.current.getMute() !== isMuted) {
        playerInstance.current.setMute(isMuted);
      }
    }

    return () => {
      // Cleanup is handled by the next effect run or unmount
    };
  }, [isLive, isWithheld, stream, sources.length, selectedQuality, volume]);

  // Specific cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerInstance.current) {
        console.log('[Player] Final cleanup on unmount');
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
            className={`absolute top-4 right-4 z-50 pointer-events-auto status-badge cursor-pointer ${(isLive && !hasError) ? 'badge-live active:scale-95 transition-transform' : (isStarting ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 border-amber-500/20 dark:border-amber-500/30' : 'badge-offline')}`}
            onClick={(e) => {
              e.stopPropagation();
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
