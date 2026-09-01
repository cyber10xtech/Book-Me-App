export const UPDATE_POPUP_STORAGE_KEY = 'bookme_update_popup_tracker';
export const MAX_DAILY_POPUP_DISPLAYS = 3;
export const MIN_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface PopupTrackerState {
  date: string; // 'YYYY-MM-DD'
  displayCount: number;
  lastDisplayTime: number; // timestamp in ms
  sessionStartTime: number; // timestamp in ms
}

/**
 * Formats a Date object into a local 'YYYY-MM-DD' string.
 */
export function getTodayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves the current popup tracker state from localStorage.
 * Automatically resets displayCount if the calendar day has changed.
 */
export function getPopupTrackerState(now = new Date()): PopupTrackerState {
  const today = getTodayDateString(now);
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(UPDATE_POPUP_STORAGE_KEY) : null;
    if (raw) {
      const parsed: PopupTrackerState = JSON.parse(raw);
      if (parsed && parsed.date === today) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[UpdateFrequencyManager] Failed to read tracker state:', err);
  }

  // New day or missing tracker — initialize fresh state for today
  const newState: PopupTrackerState = {
    date: today,
    displayCount: 0,
    lastDisplayTime: 0,
    sessionStartTime: now.getTime(),
  };
  savePopupTrackerState(newState);
  return newState;
}

/**
 * Persists the popup tracker state to localStorage.
 */
export function savePopupTrackerState(state: PopupTrackerState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(UPDATE_POPUP_STORAGE_KEY, JSON.stringify(state));
    }
  } catch (err) {
    console.warn('[UpdateFrequencyManager] Failed to save tracker state:', err);
  }
}

/**
 * Resets/initializes session start time when the app is opened or foregrounded.
 */
export function initAppSession(now = new Date()): PopupTrackerState {
  const state = getPopupTrackerState(now);
  const updated: PopupTrackerState = {
    ...state,
    sessionStartTime: now.getTime(),
  };
  savePopupTrackerState(updated);
  return updated;
}

/**
 * Evaluates whether an update popup is eligible to be displayed.
 *
 * Rules:
 * 1. Maximum 3 displays per calendar day.
 * 2. 1st display of the day is eligible immediately on first launch.
 * 3. 2nd & 3rd displays require at least 30 minutes of active session time
 *    since session start AND at least 30 minutes since last display.
 */
export function canShowUpdatePopup(now = new Date(), currentSessionStartTime?: number): boolean {
  const state = getPopupTrackerState(now);

  // Daily maximum of 3 displays
  if (state.displayCount >= MAX_DAILY_POPUP_DISPLAYS) {
    return false;
  }

  // First display of the day is eligible immediately
  if (state.displayCount === 0) {
    return true;
  }

  // Subsequent displays require 30 minutes of active session time and 30 minutes since last display
  const sessionStart = currentSessionStartTime ?? state.sessionStartTime ?? now.getTime();
  const sessionDuration = now.getTime() - sessionStart;
  const timeSinceLastDisplay = now.getTime() - state.lastDisplayTime;

  return sessionDuration >= MIN_SESSION_DURATION_MS && timeSinceLastDisplay >= MIN_SESSION_DURATION_MS;
}

/**
 * Records that an update popup was displayed to the user.
 * Increments displayCount and updates lastDisplayTime and sessionStartTime.
 */
export function recordUpdatePopupDisplayed(now = new Date()): PopupTrackerState {
  const state = getPopupTrackerState(now);
  const updatedState: PopupTrackerState = {
    ...state,
    displayCount: state.displayCount + 1,
    lastDisplayTime: now.getTime(),
    sessionStartTime: now.getTime(), // reset active session start window for next eligible display
  };
  savePopupTrackerState(updatedState);
  return updatedState;
}

/**
 * Calculates remaining milliseconds of active session time required before the next popup display is eligible.
 * Returns 0 if eligible now or if max daily displays reached.
 */
export function getMsUntilNextEligibleDisplay(now = new Date(), currentSessionStartTime?: number): number {
  const state = getPopupTrackerState(now);
  if (state.displayCount >= MAX_DAILY_POPUP_DISPLAYS) {
    return 0; // No more displays possible today
  }
  if (state.displayCount === 0) {
    return 0; // Eligible immediately
  }

  const sessionStart = currentSessionStartTime ?? state.sessionStartTime ?? now.getTime();
  const sessionDuration = now.getTime() - sessionStart;
  const timeSinceLastDisplay = now.getTime() - state.lastDisplayTime;

  const sessionRemaining = Math.max(0, MIN_SESSION_DURATION_MS - sessionDuration);
  const lastDisplayRemaining = Math.max(0, MIN_SESSION_DURATION_MS - timeSinceLastDisplay);

  return Math.max(sessionRemaining, lastDisplayRemaining);
}
