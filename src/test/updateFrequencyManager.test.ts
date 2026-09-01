import { describe, it, expect, beforeEach } from 'vitest';
import {
  canShowUpdatePopup,
  recordUpdatePopupDisplayed,
  getTodayDateString,
  getPopupTrackerState,
  savePopupTrackerState,
  initAppSession,
  getMsUntilNextEligibleDisplay,
  UPDATE_POPUP_STORAGE_KEY,
  MAX_DAILY_POPUP_DISPLAYS,
  MIN_SESSION_DURATION_MS,
} from '../services/updateFrequencyManager';

describe('Update Frequency Manager (Popup Display Rules)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getTodayDateString', () => {
    it('returns YYYY-MM-DD format correctly', () => {
      const fixedDate = new Date('2026-09-02T10:00:00.000Z');
      expect(getTodayDateString(fixedDate)).toBe('2026-09-02');
    });
  });

  describe('getPopupTrackerState & calendar day reset', () => {
    it('initializes fresh state when no tracker exists in localStorage', () => {
      const now = new Date('2026-09-02T09:00:00');
      const state = getPopupTrackerState(now);

      expect(state.date).toBe('2026-09-02');
      expect(state.displayCount).toBe(0);
      expect(state.lastDisplayTime).toBe(0);
      expect(state.sessionStartTime).toBe(now.getTime());
    });

    it('resets displayCount to 0 when calendar day changes', () => {
      // Day 1
      const day1 = new Date('2026-09-02T09:00:00');
      savePopupTrackerState({
        date: '2026-09-02',
        displayCount: 3,
        lastDisplayTime: day1.getTime(),
        sessionStartTime: day1.getTime(),
      });

      // Day 2
      const day2 = new Date('2026-09-03T08:00:00');
      const stateDay2 = getPopupTrackerState(day2);

      expect(stateDay2.date).toBe('2026-09-03');
      expect(stateDay2.displayCount).toBe(0);
    });
  });

  describe('canShowUpdatePopup & 30-minute / Daily Limit rules', () => {
    it('allows 1st display of the day immediately on first launch', () => {
      const now = new Date('2026-09-02T09:00:00');
      expect(canShowUpdatePopup(now)).toBe(true);
    });

    it('denies display immediately on app reopen if < 30 minutes active session time', () => {
      const t1 = new Date('2026-09-02T09:00:00'); // 9:00 AM display #1
      recordUpdatePopupDisplayed(t1);

      // User reopens app at 10:00 AM (session start 10:00 AM)
      const t2 = new Date('2026-09-02T10:00:00');
      initAppSession(t2);

      // Reopening at 10:00 AM immediately: session duration is 0 ms (< 30 mins)
      expect(canShowUpdatePopup(t2, t2.getTime())).toBe(false);
    });

    it('allows 2nd display after 30 minutes of active session time', () => {
      const t1 = new Date('2026-09-02T09:00:00'); // 9:00 AM display #1
      recordUpdatePopupDisplayed(t1);

      // Reopened at 10:00 AM
      const t2 = new Date('2026-09-02T10:00:00');
      initAppSession(t2);

      // 10:29 AM (29 mins in session) -> false
      const t29 = new Date('2026-09-02T10:29:00');
      expect(canShowUpdatePopup(t29, t2.getTime())).toBe(false);

      // 10:30 AM (30 mins in session & 90 mins since last display) -> true
      const t30 = new Date('2026-09-02T10:30:00');
      expect(canShowUpdatePopup(t30, t2.getTime())).toBe(true);
    });

    it('allows 3rd display after another 30 minutes of active use', () => {
      const t1 = new Date('2026-09-02T09:00:00'); // Display #1
      recordUpdatePopupDisplayed(t1);

      const t2 = new Date('2026-09-02T09:30:00'); // Display #2 at 9:30 AM
      recordUpdatePopupDisplayed(t2);

      // At 9:59 AM (29 mins since display #2) -> false
      const t29 = new Date('2026-09-02T09:59:00');
      expect(canShowUpdatePopup(t29, t2.getTime())).toBe(false);

      // At 10:00 AM (30 mins since display #2) -> true
      const t30 = new Date('2026-09-02T10:00:00');
      expect(canShowUpdatePopup(t30, t2.getTime())).toBe(true);
    });

    it('enforces maximum of 3 displays per calendar day', () => {
      const day = new Date('2026-09-02T09:00:00');

      // Display 1
      recordUpdatePopupDisplayed(day);
      // Display 2
      recordUpdatePopupDisplayed(new Date(day.getTime() + 35 * 60 * 1000));
      // Display 3
      recordUpdatePopupDisplayed(new Date(day.getTime() + 70 * 60 * 1000));

      const state = getPopupTrackerState(day);
      expect(state.displayCount).toBe(MAX_DAILY_POPUP_DISPLAYS);

      // Even 2 hours later, 4th display is blocked
      const later = new Date(day.getTime() + 180 * 60 * 1000);
      expect(canShowUpdatePopup(later)).toBe(false);
    });
  });

  describe('getMsUntilNextEligibleDisplay', () => {
    it('returns 0 when count is 0 (eligible immediately)', () => {
      const now = new Date('2026-09-02T09:00:00');
      expect(getMsUntilNextEligibleDisplay(now)).toBe(0);
    });

    it('returns remaining session time needed to hit 30 minutes', () => {
      const t1 = new Date('2026-09-02T09:00:00');
      recordUpdatePopupDisplayed(t1);

      const t2 = new Date('2026-09-02T10:00:00'); // session start 10:00 AM
      const t10 = new Date('2026-09-02T10:10:00'); // 10 mins into session

      const msRemaining = getMsUntilNextEligibleDisplay(t10, t2.getTime());
      expect(msRemaining).toBe(20 * 60 * 1000); // 20 minutes remaining
    });

    it('returns 0 when daily limit of 3 is reached', () => {
      const day = new Date('2026-09-02T09:00:00');
      recordUpdatePopupDisplayed(day);
      recordUpdatePopupDisplayed(new Date(day.getTime() + 35 * 60 * 1000));
      recordUpdatePopupDisplayed(new Date(day.getTime() + 70 * 60 * 1000));

      expect(getMsUntilNextEligibleDisplay(day)).toBe(0);
    });
  });
});
