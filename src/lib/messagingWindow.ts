/**
 * messagingWindow.ts
 *
 * Single source of truth for the "booking-based messaging window" rule:
 * customers and providers may only exchange chat messages for 48 hours
 * after a booking is created. After that, the conversation stays visible
 * and readable, but sending is blocked.
 *
 * This file is intentionally framework-agnostic (no React, no Supabase
 * client) so it can be copied as-is into the Business App — both apps
 * must use the exact same helper to avoid inconsistent enforcement.
 */

export const MESSAGING_WINDOW_HOURS = 48;
export const MESSAGING_WINDOW_MS = MESSAGING_WINDOW_HOURS * 60 * 60 * 1000;

/** Shown wherever a blocked send is attempted (input, send button, mic, attachment). */
export const MESSAGING_WINDOW_CLOSED_MESSAGE =
  "You must have an active booking to message this business.";

export interface MessagingWindowBooking {
  /** bookings.created_at (ISO timestamp) */
  created_at: string | null | undefined;
}

/**
 * Returns the exact Date the messaging window closes for a booking,
 * or null if the booking has no created_at (shouldn't happen in practice).
 */
export function getMessagingExpiry(
  booking: MessagingWindowBooking | null | undefined
): Date | null {
  if (!booking?.created_at) return null;
  const createdAtMs = new Date(booking.created_at).getTime();
  if (Number.isNaN(createdAtMs)) return null;
  return new Date(createdAtMs + MESSAGING_WINDOW_MS);
}

/**
 * canMessageBooking(booking) -> boolean
 *
 * True while `now < booking.created_at + 48h`.
 * Use this consistently in:
 *  - Customer App (Chats list, ChatWindow send guard)
 *  - Business App (Chats list, ChatWindow send guard)
 *  - Any route guards / message-send mutations
 */
export function canMessageBooking(
  booking: MessagingWindowBooking | null | undefined
): boolean {
  const expiresAt = getMessagingExpiry(booking);
  if (!expiresAt) return false;
  return Date.now() < expiresAt.getTime();
}
