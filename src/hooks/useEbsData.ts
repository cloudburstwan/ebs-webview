import { useState, useEffect, useRef, useCallback } from 'react';
import { ebsApi, WithholdStatus, StreamStatus } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';
import { DEFAULT_STREAM, SUPPORTED_QUALITIES, STREAM_BASE_URL, POLLING_INTERVAL_NORMAL, POLLING_INTERVAL_STARTING_SOON } from '../utils/env';


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
  const [isValidatingSources, setIsValidatingSources] = useState(false);
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

      // Find stream matching current name or default to first one if not found
      console.log("[useEbsData] Looking for stream match:", stream);
      const match = streams.find((s: StreamEntry) => s.name.toLowerCase() === stream.toLowerCase());

      let activeMatch: StreamEntry | null = null;
      if (match) {
        console.log("[useEbsData] Match found:", match.name);
        activeMatch = match;
      } else if (streams.length > 0 && stream === DEFAULT_STREAM) {
        console.log("[useEbsData] No match for default stream, falling back to first stream:", streams[0].name);
        activeMatch = streams[0];
        setStream(streams[0].name);
      } else if (stream) {
        // [Bypass Check] If stream is provided via URL (or otherwise), allow loading even if not in the list
        console.log("[useEbsData] No match found in list, but stream is provided. Bypassing check for:", stream);

        // Create a synthetic StreamEntry for the unknown stream so validation logic can proceed
        activeMatch = {
          id: `synthetic-${stream}`,
          name: stream,
          status: StreamStatus.Live, // Assume live to attempt loading
          witholdStatus: WithholdStatus.None,
          viewers: 0
        };
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
    // Using a microtask to avoid "setState during render" warning if this effect runs synchronously
    const reset = () => {
      setCurrentStream(null);
      setSources([]);
      setIsLoading(true);
      setIsValidatingSources(false);
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

  useEffect(() => {
    const validateSources = async () => {
      // Ensure we have the correct stream for the name before validating
      // If we don't have it yet, or it belongs to a different stream, wait for the next effect run
      if (!currentStream || currentStream.name.toLowerCase() !== stream.toLowerCase()) {
        return;
      }

      // Prevent fetching or validating sources if the stream is withheld
      if (currentStream.witholdStatus !== WithholdStatus.None) {
        console.log(`[useEbsData] Stream ${stream} is withheld, stopped loading stream`);
        if (sources.length > 0) setSources([]);
        setIsValidatingSources(false);
        return;
      }

      const baseUrl = STREAM_BASE_URL.endsWith('/') ? STREAM_BASE_URL : `${STREAM_BASE_URL}/`;

      const potentialSources = [
        ...SUPPORTED_QUALITIES.map((q: string) => ({
          label: q,
          file: `${baseUrl}${stream}-${q}.m3u8`,
          default: false
        })),
        { label: 'Source', type: 'hls' as const, file: `${baseUrl}${stream}.m3u8`, default: true }
      ];

      const potentialWithTypes = potentialSources.map(s => ({ ...s, type: 'hls' as const }));
      const resultsChanged = potentialWithTypes.length !== sources.length ||
        potentialWithTypes.some((v, i) => i >= sources.length || v.file !== sources[i].file || v.label !== sources[i].label || v.default !== sources[i].default);

      if (resultsChanged) {
        setSources(potentialWithTypes);
      }
      setIsValidatingSources(false);
      console.log("[useEbsData] Player Source : ", sources);
    };

    validateSources();
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
    isValidatingSources,
    refetch
  };
}
