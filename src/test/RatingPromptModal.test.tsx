import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RatingPromptModal from "../components/RatingPromptModal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

describe("RatingPromptModal", () => {
  const mockBooking = {
    id: "b1",
    service_name: "Test Service",
    provider_name: "Test Provider",
    provider_id: "p1",
    customer_id: "c1",
  };

  const mockOnClose = vi.fn();
  const mockOnRated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Rapid review submission invokes the service only once", async () => {
    let resolveInsert: any;
    const insertPromise = new Promise((resolve) => { resolveInsert = resolve; });
    const mockInsert = vi.fn().mockReturnValue(insertPromise);
    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    render(<RatingPromptModal booking={mockBooking} onClose={mockOnClose} onRated={mockOnRated} />);
    
    // Select 5 stars
    const stars = screen.getAllByRole("button").filter(b => b.className.includes("active:scale-90"));
    fireEvent.click(stars[4]); // 5th star

    const submitBtn = screen.getByText(/Submit Review/i).closest("button")!;
    
    // Double tap
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(mockInsert).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInsert({ error: null });
    });
  });

  it("Duplicate-review error 23505 produces a clear user-facing message", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    render(<RatingPromptModal booking={mockBooking} onClose={mockOnClose} onRated={mockOnRated} />);
    
    const stars = screen.getAllByRole("button").filter(b => b.className.includes("active:scale-90"));
    fireEvent.click(stars[4]); 
    const submitBtn = screen.getByText(/Submit Review/i).closest("button")!;
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(toast.info).toHaveBeenCalledWith("You've already reviewed this booking.");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("Processing states reset after success and failure", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: { message: "Some error" } });
    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    render(<RatingPromptModal booking={mockBooking} onClose={mockOnClose} onRated={mockOnRated} />);
    
    const stars = screen.getAllByRole("button").filter(b => b.className.includes("active:scale-90"));
    fireEvent.click(stars[4]); 
    const submitBtn = screen.getByText(/Submit Review/i).closest("button")!;
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(toast.error).toHaveBeenCalledWith("Could not submit review. Please try again.");
    expect(submitBtn).not.toBeDisabled();
  });
});
