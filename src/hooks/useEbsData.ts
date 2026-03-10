import { useState, useEffect } from 'react';
import { ebsApi, WithholdStatus, StreamStatus } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';
import { DEFAULT_STREAM, SUPPORTED_QUALITIES, STREAM_BASE_URL } from '../utils/env';


export function useEbsData(stream: string, setStream: (s: string) => void) {
  const [isLoading, setIsLoading] = useState(true);
  const [availableStreams, setAvailableStreams] = useState<StreamEntry[]>([]);
  const [currentStream, setCurrentStream] = useState<StreamEntry | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isValidatingSources, setIsValidatingSources] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchStreams = async () => {
      setIsLoading(true);
      const streams = await ebsApi.getStreams(abortController.signal);
      console.log("[useEbsData] Fetched streams:", streams);
      setAvailableStreams(streams);

      // Find stream matching current name or default to first one if not found
      console.log("[useEbsData] Looking for stream match:", stream);
      const match = streams.find((s: StreamEntry) => s.name.toLowerCase() === stream.toLowerCase());

      if (match) {
        console.log("[useEbsData] Match found:", match.name);
        setCurrentStream(match);
      } else if (streams.length > 0 && stream === DEFAULT_STREAM) {
        console.log("[useEbsData] No match for default stream, falling back to first stream:", streams[0].name);
        setCurrentStream(streams[0]);
        setStream(streams[0].name);
      } else if (stream) {
        // [Bypass Check] If stream is provided via URL (or otherwise), allow loading even if not in the list
        console.log("[useEbsData] No match found in list, but stream is provided. Bypassing check for:", stream);

        // Create a synthetic StreamEntry for the unknown stream so validation logic can proceed
        const syntheticStream: StreamEntry = {
          id: `synthetic-${stream}`,
          name: stream,
          status: StreamStatus.Live, // Assume live to attempt loading
          witholdStatus: WithholdStatus.None,
          viewers: 0
        };
        setCurrentStream(syntheticStream);
      } else {
        console.log("[useEbsData] No match found and no stream provided.");
        setCurrentStream(null);
      }

      setIsLoading(false);
    };

    fetchStreams();
    const interval = setInterval(fetchStreams, 30000);

    return () => {
      abortController.abort();
      clearInterval(interval);
    };
  }, [stream, setStream]);

  useEffect(() => {
    const abortController = new AbortController();

    const validateSources = async () => {
      // Ensure we have the correct stream for the name before validating
      // If we don't have it yet, or it belongs to a different stream, wait for the next effect run
      if (!currentStream || currentStream.name.toLowerCase() !== stream.toLowerCase()) {
        return;
      }

      // Prevent fetching or validating sources if the stream is withheld
      if (currentStream.witholdStatus !== WithholdStatus.None) {
        console.log(`[useEbsData] Stream ${stream} is withheld, skipping source validation`);
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
    return () => abortController.abort();
  }, [stream, currentStream]);

  return {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    isValidatingSources
  };
}
