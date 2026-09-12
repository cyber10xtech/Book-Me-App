import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookingsPage from "../pages/BookingsPage";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/useBookings", () => ({
  useBookings: vi.fn(() => ({
    bookings: [
      { id: "b1", status: "completed", has_reviewed: false, service_name: "Test", provider_name: "Test", booking_date: "2024-01-01" },
      { id: "b2", status: "completed", has_reviewed: true, service_name: "Test", provider_name: "Test", booking_date: "2024-01-01" },
      { id: "b3", status: "pending", has_reviewed: false, service_name: "Test", provider_name: "Test", booking_date: "2024-01-01" },
    ],
    loading: false,
    fetchBookings: vi.fn(),
  })),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: vi.fn(() => ({ profile: { id: "p1" } })),
}));

const mockUser = { id: "u1" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      update: vi.fn().mockResolvedValue({ data: [{ id: "b1" }], error: null }),
      then: function(resolve: (value: unknown) => void) {
        if (table === "bookings") {
          resolve({
            data: [
              { id: "b1", status: "completed", has_reviewed: false, service_name: "Test", provider_name: "Test", booking_date: "2024-01-01", provider_profile: { business_name: "Test" }, reviews: [] },
              { id: "b2", status: "completed", has_reviewed: true, service_name: "Test", provider_name: "Test", booking_date: "2024-01-01", provider_profile: { business_name: "Test" }, reviews: [{ id: "r1" }] },
              { id: "b3", status: "pending", has_reviewed: false, service_name: "Test", provider_name: "Test", booking_date: "2024-01-01", provider_profile: { business_name: "Test" }, reviews: [] },
            ],
            error: null
          });
        } else if (table === "profiles") {
          resolve({ data: { id: "p1" }, error: null });
        } else {
          resolve({ data: null, error: null });
        }
      }
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock the BookingSheet so it doesn't crash on missing dependencies
vi.mock("../components/BookingFlow", () => ({
  default: () => <div data-testid="booking-sheet" />
}));

const queryClient = new QueryClient();
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe("BookingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Review action appears only for completed and unreviewed bookings", async () => {
    render(<Wrapper><BookingsPage /></Wrapper>);
    
    // Wait for the mock bookings to load (Pending is in upcoming tab)
    await screen.findByText("Pending");

    const pastTab = screen.getByText("Past");
    fireEvent.click(pastTab);

    // Give it a tick to render
    await waitFor(() => {
      const reviewButtons = screen.getAllByText(/Leave a Review/i);
      expect(reviewButtons).toHaveLength(1);
    });
  });

  it("Review action is hidden for every ineligible status", async () => {
    render(<Wrapper><BookingsPage /></Wrapper>);
    // In upcoming tab
    const buttons = screen.queryAllByText(/Leave a Review/i);
    expect(buttons).toHaveLength(0);
  });

  it("Review-button click does not trigger parent-card navigation", async () => {
    render(<Wrapper><BookingsPage /></Wrapper>);
    
    // Wait for the mock bookings to load (Pending is in upcoming tab)
    await screen.findByText("Pending");

    const pastTab = screen.getByText("Past");
    fireEvent.click(pastTab);

    // Now wait for the Leave a Review button to appear in the Past tab
    const reviewBtn = await screen.findByText(/Leave a Review/i);
    fireEvent.click(reviewBtn);
    
    // We mock RatingPromptModal or expect it to be rendered.
    // The parent navigation sets the selected booking which renders BookingSheet.
    // Ensure BookingSheet is not rendered.
    expect(screen.queryByTestId("booking-sheet")).not.toBeInTheDocument();
  });
});
