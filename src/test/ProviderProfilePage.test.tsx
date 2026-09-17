import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProviderProfilePage from "../pages/ProviderProfilePage";
import { MemoryRouter } from "react-router-dom";

// Mock Capacitor so it doesn't try to redirect
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true, // bypass the redirect
  }
}));

// Mock hooks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "p1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1" } })),
}));

vi.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: vi.fn(() => ({ requireAuth: (cb: any) => cb(), modal: null })),
}));

vi.mock("@/hooks/useCustomerPoints", () => ({
  useCustomerPoints: vi.fn(() => ({ awardPoints: vi.fn() })),
}));

vi.mock("@/lib/readableLocation", () => ({
  useReadableLocation: vi.fn(() => "123 Test St"),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() }
}));

const mockProvider = {
  id: "p1",
  business_name: "Test Provider",
  is_active: true,
  user_id: "pu1",
  business_hours: null, // Open by default
};

const mockServices = [
  { id: "s1", name: "Haircut", price: 2000, description: "{}" }
];

vi.mock("@/hooks/useProviders", () => ({
  useProviderDetail: vi.fn(() => ({
    provider: mockProvider,
    services: mockServices,
    loading: false
  })),
}));

// Mock scrollIntoView
const scrollIntoViewMock = vi.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

describe("ProviderProfilePage - Book Now CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicks Book Now CTA and scrolls to services section", async () => {
    render(
      <MemoryRouter>
        <ProviderProfilePage />
      </MemoryRouter>
    );
    
    // Wait for render
    const bookNowBtn = await screen.findByText("Book Now");
    expect(bookNowBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(bookNowBtn);
    });

    // We verify the mock was called.
    // The component sets scrollPending(true) and uses requestAnimationFrame.
    // We can advance timers or wait for the effect to fire.
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    });
  });

  it("disables Book Now CTA if business is closed", async () => {
    // Override the mock temporarily
    const { useProviderDetail } = await import("@/hooks/useProviders");
    vi.mocked(useProviderDetail).mockReturnValue({
      provider: { ...mockProvider, is_active: false }, // Closed
      services: mockServices,
      loading: false
    });

    render(
      <MemoryRouter>
        <ProviderProfilePage />
      </MemoryRouter>
    );

    const bookNowBtn = await screen.findByText(/Business Inactive/i, { selector: 'button' });
    expect(bookNowBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(bookNowBtn);
    });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Business Inactive"));
  });

  it("renders Provider not found and blocks booking if profile role is customer (incomplete incident record)", async () => {
    const { useProviderDetail } = await import("@/hooks/useProviders");
    vi.mocked(useProviderDetail).mockReturnValue({
      provider: { ...mockProvider, role: "customer" } as any,
      services: mockServices as any,
      loading: false
    });

    render(
      <MemoryRouter>
        <ProviderProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Provider not found")).toBeInTheDocument();
    expect(screen.queryByText("Book Now")).not.toBeInTheDocument();
    expect(screen.queryByText("Haircut")).not.toBeInTheDocument();
  });
});
