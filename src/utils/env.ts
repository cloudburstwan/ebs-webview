/**
 * Project-wide environment variables and constants.
 * These can be overridden via Vite environment variables (VITE_*)
 */

export const DEFAULT_STREAM = import.meta.env.VITE_DEFAULT_STREAM || 'test';

export const SUPPORTED_QUALITIES = import.meta.env.VITE_SUPPORTED_QUALITIES
  ? import.meta.env.VITE_SUPPORTED_QUALITIES.split(',')
  : ['360p', '720p'];

export const DEFAULT_QUALITY = import.meta.env.VITE_DEFAULT_QUALITY || 'Source';

export const VALIDATE_SOURCES = import.meta.env.VITE_VALIDATE_SOURCES === 'true' || false;
export const FILTER_STREAMS = import.meta.env.VITE_FILTER_STREAMS === 'true';

export const DEFAULT_BASE_URL = import.meta.env.VITE_STREAM_BASE_URL || 'https://stream.equestria.horse';

const suffix = import.meta.env.VITE_STREAM_SUFFIX || 's';
export const STREAM_BASE_URL = DEFAULT_BASE_URL.endsWith('/') ? DEFAULT_BASE_URL + suffix : DEFAULT_BASE_URL + '/' + suffix;

export const API_VERSION = import.meta.env.VITE_API_VERSION || 'api/v1';

export const PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE = parseFloat(import.meta.env.VITE_PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE || '1.0');
export const PLAYER_LIVE_SYNC_DURATION = parseInt(import.meta.env.VITE_PLAYER_LIVE_SYNC_DURATION || '6', 10);
