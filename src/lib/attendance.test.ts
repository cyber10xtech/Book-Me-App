import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Customer Review Eligibility Logic', () => {
  beforeEach(() => {
    // Fixed clock for testing historical dates
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const checkEligibility = (booking: any, reviewedIds: Set<string>) => {
    if (reviewedIds.has(booking.id)) return false;
    if (booking.provider_attendance_outcome === 'no_show') return false;
    if (booking.status !== 'completed') return false; // Basic safety check for cancelled/rejected etc
    
    if (booking.provider_attendance_outcome === 'attended') return true;

    // Historical fallback (14 days) if outcome is not set
    const bDate = new Date(booking.booking_date + "T00:00:00");
    const now = new Date();
    const daysOld = (now.getTime() - bDate.getTime()) / (1000 * 3600 * 24);

    if (daysOld <= 14 && booking.provider_attendance_outcome == null) return true;
    
    return false;
  };

  it('New attended completed booking is eligible', () => {
    const booking = { id: '1', status: 'completed', provider_attendance_outcome: 'attended', booking_date: '2026-09-13' };
    expect(checkEligibility(booking, new Set())).toBe(true);
  });
  
  it('New no_show booking is ineligible', () => {
    const booking = { id: '2', status: 'completed', provider_attendance_outcome: 'no_show', booking_date: '2026-09-13' };
    expect(checkEligibility(booking, new Set())).toBe(false);
  });

  it('Historical completed booking within 14 days is eligible under compatibility rule', () => {
    const booking = { id: '3', status: 'completed', provider_attendance_outcome: null, booking_date: '2026-09-10' };
    expect(checkEligibility(booking, new Set())).toBe(true);
  });

  it('Historical completed booking older than 14 days is ineligible', () => {
    const booking = { id: '4', status: 'completed', provider_attendance_outcome: null, booking_date: '2026-08-10' };
    expect(checkEligibility(booking, new Set())).toBe(false);
  });

  it('Future bookings are handled based on outcome', () => {
    // If somehow a future booking is marked completed and attended
    const booking = { id: '5', status: 'completed', provider_attendance_outcome: 'attended', booking_date: '2026-09-20' };
    expect(checkEligibility(booking, new Set())).toBe(true);
  });

  it('Cancelled or rejected statuses are ineligible', () => {
    const booking = { id: '6', status: 'cancelled', provider_attendance_outcome: null, booking_date: '2026-09-13' };
    expect(checkEligibility(booking, new Set())).toBe(false);
    
    const rejected = { id: '7', status: 'rejected', provider_attendance_outcome: null, booking_date: '2026-09-13' };
    expect(checkEligibility(rejected, new Set())).toBe(false);
  });

  it('Already reviewed bookings are ineligible', () => {
    const booking = { id: '8', status: 'completed', provider_attendance_outcome: 'attended', booking_date: '2026-09-13' };
    const reviewed = new Set(['8']);
    expect(checkEligibility(booking, reviewed)).toBe(false);
  });
});
