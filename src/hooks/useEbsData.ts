import { useState, useEffect } from 'react';
import { ebsApi, WithholdStatus } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';
import { DEFAULT_STATION, SUPPORTED_QUALITIES, VALIDATE_SOURCES, STREAM_BASE_URL } from '../utils/env';


export function useEbsData(station: string, setStation: (s: string) => void) {
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

      // Find stream matching station or default to first one if station not found
      console.log("[useEbsData] Looking for station match:", station);
      const match = streams.find((s: StreamEntry) => s.name.toLowerCase() === station.toLowerCase());
      
      if (match) {
        console.log("[useEbsData] Match found:", match.name);
        setCurrentStream(match);
      } else if (streams.length > 0 && station === DEFAULT_STATION) {
        console.log("[useEbsData] No match for default station, falling back to first stream:", streams[0].name);
        setCurrentStream(streams[0]);
        setStation(streams[0].name);
      } else {
        console.log("[useEbsData] No match found for:", station);
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
  }, [station, setStation]);

  useEffect(() => {
    const abortController = new AbortController();

    const validateSources = async () => {
      // Ensure we have the correct stream for the station before validating
      // If we don't have it yet, or it belongs to a different station, wait for the next effect run
      if (!currentStream || currentStream.name.toLowerCase() !== station.toLowerCase()) {
        return;
      }

      // Prevent fetching or validating sources if the stream is withheld
      if (currentStream.witholdStatus !== WithholdStatus.None) {
        console.log(`[useEbsData] Stream ${station} is withheld, skipping source validation`);
        if (sources.length > 0) setSources([]);
        setIsValidatingSources(false);
        return;
      }

      const baseUrl = STREAM_BASE_URL.endsWith('/') ? STREAM_BASE_URL : `${STREAM_BASE_URL}/`;

      const potentialSources = [
        ...SUPPORTED_QUALITIES.map((q: string) => ({
          label: q,
          file: `${baseUrl}${station}-${q}.m3u8`,
          default: false
        })),
        { label: 'Source', type: 'hls' as const, file: `${baseUrl}${station}.m3u8`, default: true }
      ];

      if (VALIDATE_SOURCES) {
        const validationPromises = potentialSources.map(async (src) => {
          try {
            const response = await fetch(src.file, {
              method: 'HEAD',
              signal: abortController.signal
            });
            if (response.ok) {
              return {
                label: src.label,
                type: 'hls' as const,
                file: src.file,
                default: src.default
              };
            }
          } catch (error: any) {
            if (error.name === 'AbortError') return null;

            try {
              const fallback = await fetch(src.file, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: abortController.signal
              });
              if (fallback.type === 'opaque') {
                return {
                  label: src.label,
                  type: 'hls' as const,
                  file: src.file,
                  default: src.default
                };
              }
            } catch (fallbackError) {
              return null;
            }
          }
          return null;
        });

        const results = await Promise.all(validationPromises);
        const validated = results.filter((r): r is NonNullable<typeof r> => r !== null);

        if (!abortController.signal.aborted) {
          // Deep compare results to avoid redundant state updates which trigger player refreshes
        const resultsChanged = validated.length !== sources.length || 
          validated.some((v, i) => i >= sources.length || v.file !== sources[i].file || v.label !== sources[i].label || v.default !== sources[i].default);

        if (resultsChanged) {
          console.log(`[useEbsData] Sources changed for ${station}, updating state`);
          setSources(validated);
        } else {
          // console.log(`[useEbsData] Sources unchanged for ${station}, skipping update`);
        }
          setIsValidatingSources(false);
        }
      } else {
        const potentialWithTypes = potentialSources.map(s => ({ ...s, type: 'hls' as const }));
        const resultsChanged = potentialWithTypes.length !== sources.length ||
          potentialWithTypes.some((v, i) => i >= sources.length || v.file !== sources[i].file || v.label !== sources[i].label || v.default !== sources[i].default);

        if (resultsChanged) {
          setSources(potentialWithTypes);
        }
        setIsValidatingSources(false);
      }
      console.log("[useEbsData] Player Source : ", sources);
    };

    validateSources();
    return () => abortController.abort();
  }, [station, currentStream]);

  return {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    isValidatingSources
  };
}
