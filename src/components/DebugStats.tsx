import { useState, useEffect, useRef } from 'react';
import { X, Activity } from 'lucide-react';

interface DebugStatsProps {
  playerInstance: any;
  onClose: () => void;
}

interface Stats {
  resolution: string;
  bitrate: string;
  latency: string;
  droppedFrames: number;
  totalFrames: number;
  bufferLength: number;
  protocol: string;
  playerState: string;
}

const EMPTY: Stats = {
  resolution: '—', bitrate: '—', latency: '—',
  droppedFrames: 0, totalFrames: 0, bufferLength: 0,
  protocol: '—', playerState: '—',
};

const DebugStats = ({ playerInstance, onClose }: DebugStatsProps) => {
  const [stats, setStats] = useState<Stats>(EMPTY);
  const ivl = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playerInstance) return;
    const vid = (): HTMLVideoElement | null => {
      try { return playerInstance.getContainerElement?.()?.querySelector('video'); } catch { return null; }
    };
    const tick = () => {
      const n: Stats = { ...EMPTY };
      try {
        const src = playerInstance.getCurrentSource?.();
        if (src?.type) n.protocol = src.type.toUpperCase();
        const lvls = playerInstance.getQualityLevels?.();
        const qi = playerInstance.getCurrentQuality?.();
        if (lvls && qi !== undefined && lvls[qi]) {
          const q = lvls[qi];
          if (q.width && q.height) n.resolution = `${q.width}×${q.height}`;
          if (q.bitrate) n.bitrate = `${(q.bitrate / 1000).toFixed(0)} kbps`;
        }
        if (typeof playerInstance.getLiveLatency === 'function') {
          const l = playerInstance.getLiveLatency();
          if (typeof l === 'number' && isFinite(l)) n.latency = `${l.toFixed(2)}s`;
        }
        const st = playerInstance.getState?.();
        if (st) n.playerState = st;
        const v = vid();
        if (v) {
          if (n.resolution === '—' && v.videoWidth && v.videoHeight) n.resolution = `${v.videoWidth}×${v.videoHeight}`;
          if (typeof v.getVideoPlaybackQuality === 'function') {
            const vpq = v.getVideoPlaybackQuality();
            n.droppedFrames = vpq.droppedVideoFrames ?? 0;
            n.totalFrames = vpq.totalVideoFrames ?? 0;
          } else if ('webkitDroppedFrameCount' in v) {
            n.droppedFrames = (v as any).webkitDroppedFrameCount ?? 0;
            n.totalFrames = (v as any).webkitDecodedFrameCount ?? 0;
          }
          const ct = v.currentTime;
          for (let i = 0; i < v.buffered.length; i++) {
            if (v.buffered.start(i) <= ct && v.buffered.end(i) >= ct) {
              n.bufferLength = parseFloat((v.buffered.end(i) - ct).toFixed(2));
              break;
            }
          }
        }
      } catch (e) { console.warn('[DebugStats]', e); }
      setStats(n);
    };
    tick();
    ivl.current = setInterval(tick, 1000);
    return () => { if (ivl.current) clearInterval(ivl.current); };
  }, [playerInstance]);

  const pct = stats.totalFrames > 0 ? ((stats.droppedFrames / stats.totalFrames) * 100).toFixed(2) : '0.00';

  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-auto select-text" onClick={e => e.stopPropagation()}>
      <div className="bg-black/85 text-green-400 font-mono text-[11px] leading-relaxed p-4 rounded-lg border border-green-500/25 backdrop-blur-md shadow-2xl min-w-[280px] max-w-[340px]">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-green-500/20">
          <div className="flex items-center gap-2 text-green-300">
            <Activity size={13} className="animate-pulse" />
            <span className="font-bold uppercase tracking-widest text-[10px]">Stats for Nerds</span>
          </div>
          <button onClick={onClose} className="text-green-500/60 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10" aria-label="Close Stats">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-1.5">
          <R l="Protocol" v={stats.protocol} />
          <R l="Resolution" v={stats.resolution} />
          <R l="Bitrate" v={stats.bitrate} />
          <R l="Latency" v={stats.latency} />
          <R l="Buffer Health" v={`${stats.bufferLength}s`} w={stats.bufferLength > 0 && stats.bufferLength < 1} />
          <R l="Dropped Frames" v={`${stats.droppedFrames} / ${stats.totalFrames} (${pct}%)`} w={stats.droppedFrames > 0} />
          <R l="Player State" v={stats.playerState} d />
        </div>
      </div>
    </div>
  );
};

const R = ({ l, v, w, d }: { l: string; v: string; w?: boolean; d?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="text-green-500/60 whitespace-nowrap">{l}</span>
    <span className={`font-semibold text-right ${w ? 'text-orange-400' : d ? 'text-white/40' : 'text-white/90'}`}>{v}</span>
  </div>
);

export default DebugStats;
