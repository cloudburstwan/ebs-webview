import { useState, useEffect, useRef, useCallback } from 'react';
import { ebsApi, WithholdStatus, StreamStatus } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';
import { DEFAULT_STREAM, DEFAULT_BASE_URL, POLLING_INTERVAL_NORMAL, POLLING_INTERVAL_STARTING_SOON } from '../utils/env';


export interface PlayerSource {
  label: string;
  file: string;
  type: 'hls' | 'webrtc' | 'dash';
  default?: boolean;
}

export function useEbsData(stream: string, setStream: (s: string) => void) {
  const [isLoading, setIsLoading] = useState(true);
  const [availableStreams, setAvailableStreams] = useState<StreamEntry[]>([]);
  const [currentStream, setCurrentStream] = useState<StreamEntry | null>(null);
  const [sources, setSources] = useState<PlayerSource[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchStreamsRef = useRef<() => Promise<void>>(async () => { });

  const fetchStreams = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const streams = await ebsApi.getStreams(abortControllerRef.current.signal);
      console.log("[useEbsData] Fetched streams:", streams);
      setAvailableStreams(streams);

      // Find stream matching current id or default to first one if not found
      console.log("[useEbsData] Looking for stream match by id:", stream);
      const match = streams.find((s: StreamEntry) => s.id === stream);

      let activeMatch: StreamEntry | null = null;
      if (match) {
        console.log("[useEbsData] Match found:", match.id, match.name);
        activeMatch = match;
      } else if (streams.length > 0 && stream === DEFAULT_STREAM) {
        console.log("[useEbsData] No match for default stream, falling back to first stream:", streams[0].id, streams[0].name);
        activeMatch = streams[0];
        setStream(streams[0].id);
      } else if (stream) {
        // [Bypass Check] If stream is provided via URL (or otherwise), allow loading even if not in the list
        console.log("[useEbsData] No match found in list, but stream is provided. Bypassing check for:", stream);

        // Create a synthetic StreamEntry for the unknown stream so validation logic can proceed
        activeMatch = {
          id: stream,
          name: stream,
          humanName: stream,
          status: StreamStatus.Live, // Assume live to attempt loading
          witholdStatus: WithholdStatus.None,
          viewers: 0,
          urls: null,
        };
      }

      // Refresh the current stream's live status via the per-stream endpoint.
      // This gives us the most up-to-date status/withhold info AND embedded playback URLs.
      if (activeMatch && activeMatch.id) {
        try {
          const fresh = await ebsApi.getStream(activeMatch.id, abortControllerRef.current?.signal);
          if (fresh) {
            console.log(`[useEbsData] Per-stream detail for ${activeMatch.id}:`, {
              status: fresh.status,
              statusLabel: fresh.statusLabel,
              hasUrls: !!fresh.urls,
              source: fresh.urls?.source,
            });
            activeMatch = fresh;
          }
        } catch (e) {
          // Non-fatal: fall back to the list match
          console.warn('[useEbsData] Per-stream status check failed, using list data:', e);
        }
      }

      setCurrentStream(activeMatch);
      setIsLoading(false);

      // Schedule next fetch
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      const interval = activeMatch?.status === StreamStatus.Starting
        ? POLLING_INTERVAL_STARTING_SOON
        : POLLING_INTERVAL_NORMAL;

      console.log(`[useEbsData] Next polling in ${interval / 1000}s (Status: ${activeMatch?.status})`);
      timeoutRef.current = setTimeout(() => fetchStreamsRef.current(), interval);
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') return;
      console.error("[useEbsData] Error fetching streams:", err);
      setIsLoading(false);
    }
  }, [stream, setStream]);

  useEffect(() => {
    fetchStreamsRef.current = fetchStreams;
  }, [fetchStreams]);

  useEffect(() => {
    // Reset data immediately on stream change
    const reset = () => {
      setCurrentStream(null);
      setSources([]);
      setIsLoading(true);
    };
    reset();

    fetchStreams();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [stream, fetchStreams]);

  // Build player sources from API-provided playback URLs
  useEffect(() => {
    if (!currentStream || currentStream.id !== stream) {
      return;
    }

    // Don't provide sources if the stream is withheld
    if (currentStream.witholdStatus !== WithholdStatus.None) {
      console.log(`[useEbsData] Stream ${stream} is withheld, no sources available`);
      if (sources.length > 0) setSources([]);
      return;
    }

    // Use API-provided playback URLs when available
    if (currentStream.urls) {
      const apiSources: PlayerSource[] = [];

      // LL-HLS as primary source
      if (currentStream.urls.llhls) {
        apiSources.push({
          label: 'Source',
          file: currentStream.urls.llhls,
          type: 'hls',
          default: true,
        });
      }

      // WebRTC as secondary low-latency source
      if (currentStream.urls.webrtc) {
        apiSources.push({
          label: 'Low Latency',
          file: currentStream.urls.webrtc,
          type: 'webrtc',
          default: false,
        });
      }

      console.log(`[useEbsData] API-provided sources (${currentStream.urls.source} tier):`, apiSources);

      const resultsChanged = apiSources.length !== sources.length ||
        apiSources.some((v, i) => i >= sources.length || v.file !== sources[i].file || v.label !== sources[i].label);

      if (resultsChanged) {
        setSources(apiSources);
      }
    } else if (currentStream.status === StreamStatus.Live) {
      // Stream is live but API doesn't embed playback URLs — construct from env
      const suffix = import.meta.env.VITE_STREAM_SUFFIX || 's';
      const qualities: string[] = import.meta.env.VITE_SUPPORTED_QUALITIES
        ? import.meta.env.VITE_SUPPORTED_QUALITIES.split(',').map((q: string) => q.trim())
        : [];

      const fallbackSources: PlayerSource[] = [];

      // Source quality (no suffix) as default
      fallbackSources.push({
        label: 'Source',
        file: `${DEFAULT_BASE_URL}/${suffix}/${currentStream.name}.m3u8`,
        type: 'hls',
        default: true,
      });

      // Additional quality variants: {name}-{quality}.m3u8
      for (const q of qualities) {
        fallbackSources.push({
          label: q,
          file: `${DEFAULT_BASE_URL}/${suffix}/${currentStream.name}-${q}.m3u8`,
          type: 'hls',
          default: false,
        });
      }

      console.log(`[useEbsData] No API URLs, using fallback HLS sources:`, fallbackSources);

      const resultsChanged = fallbackSources.length !== sources.length ||
        fallbackSources.some((v, i) => i >= sources.length || v.file !== sources[i].file);

      if (resultsChanged) {
        setSources(fallbackSources);
      }
    } else {
      // Stream is offline — no sources
      if (sources.length > 0) {
        console.log(`[useEbsData] Stream ${stream} is offline, clearing sources`);
        setSources([]);
      }
    }
  }, [stream, currentStream, sources.length]);

  const refetch = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    fetchStreams();
  };

  return {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    refetch
  };
}

