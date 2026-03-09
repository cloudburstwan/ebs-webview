import { useState, useEffect } from 'react';
import { ebsApi, STREAM_BASE_URL } from '../utils/ebs';
import type { StreamEntry } from '../utils/ebs';

export function useEbsData(station: string, setStation: (s: string) => void) {
  const [isLoading, setIsLoading] = useState(true);
  const [availableStreams, setAvailableStreams] = useState<StreamEntry[]>([]);
  const [currentStream, setCurrentStream] = useState<StreamEntry | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isValidatingSources, setIsValidatingSources] = useState(false);

  useEffect(() => {
    const fetchStreams = async () => {
      setIsLoading(true);
      const streams = await ebsApi.getStreams();
      setAvailableStreams(streams);

      // Find stream matching station or default to first one if station not found
      const match = streams.find((s: StreamEntry) => s.station.toLowerCase() === station.toLowerCase());
      if (match) {
        setCurrentStream(match);
      } else if (streams.length > 0 && station === 'test') {
        // If we are on 'test' but it's not live, maybe pick the first available
        setCurrentStream(streams[0]);
        setStation(streams[0].station);
      } else {
        setCurrentStream(null);
      }

      setIsLoading(false);
    };

    fetchStreams();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStreams, 30000);
    return () => clearInterval(interval);
  }, [station, setStation]);

  useEffect(() => {
    const validateSources = async () => {
      // If we already have sources from the API, use them
      if (currentStream?.sources && currentStream.sources.length > 0) {
        setSources(currentStream.sources);
        setIsValidatingSources(false);
        return;
      }

      setIsValidatingSources(true);

      // If we already have sources for this station and they aren't empty, 
      // we might have already validated. 
      if (sources.length > 0 && !currentStream?.sources?.length) {
        setIsValidatingSources(false);
        return;
      }

      const baseUrl = STREAM_BASE_URL.endsWith('/') ? STREAM_BASE_URL : `${STREAM_BASE_URL}/`;
      const potentialSources = [
        { label: '1080p', file: `${baseUrl}${station}-1080p.m3u8` },
        { label: '720p', file: `${baseUrl}${station}-720p.m3u8` },
        { label: '360p', file: `${baseUrl}${station}-360p.m3u8` },
        { label: 'Direct', file: `${baseUrl}${station}.m3u8`, default: true }
      ];

      const validated = [];
      for (const src of potentialSources) {
        try {
          // Step 1: Try a regular fetch to read status code (works if CORS is enabled)
          const response = await fetch(src.file, { method: 'HEAD' });
          if (response.ok) {
            validated.push({
              label: src.label,
              type: 'hls' as const,
              file: src.file,
              default: src.default
            });
          } else if (response.status === 404) {
            console.log(`[Validation] Source ${src.label} explicitly return 404 - skipping.`);
          }
        } catch (error) {
          // Step 2: Fallback to no-cors if blocked by security policies
          try {
            const fallback = await fetch(src.file, { method: 'HEAD', mode: 'no-cors' });
            if (fallback.type === 'opaque') {
              console.log(`[Validation] Source ${src.label} blocked by CORS - using best-effort validation.`);
              validated.push({
                label: src.label,
                type: 'hls' as const,
                file: src.file,
                default: src.default
              });
            }
          } catch (fallbackError) {
            console.warn(`[Validation] Full validation failure for ${src.label}:`, fallbackError);
          }
        }
      }

      setSources(validated);
      setIsValidatingSources(false);
    };

    validateSources();
  }, [station, currentStream]);

  return {
    isLoading,
    availableStreams,
    currentStream,
    sources,
    isValidatingSources
  };
}
