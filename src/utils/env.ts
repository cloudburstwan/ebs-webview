/**
 * Project-wide environment variables and constants.
 * These can be overridden via Vite environment variables (VITE_*)
 */

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Equestrian Broadcast Service';

export const DEFAULT_STREAM = import.meta.env.VITE_DEFAULT_STREAM || 'test';

export const FILTER_STREAMS = import.meta.env.VITE_FILTER_STREAMS === 'true';

export const DEFAULT_BASE_URL = import.meta.env.VITE_STREAM_BASE_URL || 'https://stream.equestria.horse';

export const API_VERSION = import.meta.env.VITE_API_VERSION || 'api/v1';

export const PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE = parseFloat(import.meta.env.VITE_PLAYER_MAX_LIVE_SYNC_PLAYBACK_RATE || '1.0');
export const PLAYER_LIVE_SYNC_DURATION = parseInt(import.meta.env.VITE_PLAYER_LIVE_SYNC_DURATION || '6', 10);

export const POLLING_INTERVAL_NORMAL = 30000;
export const POLLING_INTERVAL_STARTING_SOON = 10000;

export const BRANDED_OVERLAY = import.meta.env.VITE_BRANDED_OVERLAY === 'true';

