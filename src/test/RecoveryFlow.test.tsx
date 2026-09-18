import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecoveryEmail from "../pages/RecoveryEmail";
import RecoveryOTP from "../pages/RecoveryOTP";
import RecoveryNewPassword from "../pages/RecoveryNewPassword";
import RecoverySuccess from "../pages/RecoverySuccess";
import { supabase } from "@/lib/supabase";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
      verifyOtp: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: {} } } }),
    },
  },
}));

// Mock Sonner Toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("Password Recovery Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("RecoveryEmail", () => {
    it("validates email format and shows green tick for syntax validity only", () => {
      const { container } = render(
        <MemoryRouter>
          <RecoveryEmail />
        </MemoryRouter>
      );
      
      const input = screen.getByPlaceholderText("you@example.com");
      const button = screen.getByRole("button", { name: "Send verification code" });
      
      expect(button).toBeDisabled();
      
      // Invalid email
      fireEvent.change(input, { target: { value: "invalidemail" } });
      expect(button).toBeDisabled();
      expect(container.querySelector(".text-green-500")).toBeNull();
      
      // Valid email
      fireEvent.change(input, { target: { value: "test@example.com" } });
      expect(button).not.toBeDisabled();
      expect(container.querySelector(".text-green-500")).not.toBeNull();
    });



    it("prevents duplicate submission", async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100)));
      
      render(
        <MemoryRouter>
          <RecoveryEmail />
        </MemoryRouter>
      );
      
      const input = screen.getByPlaceholderText("you@example.com");
      fireEvent.change(input, { target: { value: "test@example.com" } });
      
      const button = screen.getByRole("button", { name: "Send verification code" });
      fireEvent.click(button);
      
      expect(button).toBeDisabled();
      expect(screen.getByText("Sending...")).toBeInTheDocument();
      
      await waitFor(() => {
        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("RecoveryOTP", () => {
    beforeEach(() => {
      sessionStorage.setItem("recovery_email", "test@example.com");
      sessionStorage.setItem("recovery_stage", "otp");
    });

    it("enforces 8-digit OTP exactly", () => {
      render(
        <MemoryRouter>
          <RecoveryOTP />
        </MemoryRouter>
      );
      
      const input = screen.getByLabelText("8-digit verification code");
      const button = screen.getByRole("button", { name: "Verify code" });
      
      fireEvent.change(input, { target: { value: "123" } });
      expect(button).toBeDisabled();
      
      // Simulate pasting 8 digits, ensure it only calls verifyOtp once
      fireEvent.change(input, { target: { value: "12345678" } });
      // Click button immediately as if spamming
      fireEvent.click(button);
      
      // Should auto-submit but only once
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: "test@example.com", token: "12345678", type: "recovery" });
      expect(supabase.auth.verifyOtp).toHaveBeenCalledTimes(1);
    });

    it("shows incorrect code message", async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ data: { user: null, session: null }, error: { message: "Invalid code", status: 400, name: "" } });
      const { toast } = await import("sonner");
      
      render(
        <MemoryRouter>
          <RecoveryOTP />
        </MemoryRouter>
      );
      
      const input = screen.getByLabelText("8-digit verification code");
      fireEvent.change(input, { target: { value: "12345678" } });
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Incorrect code. Please try again.");
      });
    });
  });

  describe("RecoveryNewPassword", () => {
    it("enforces missing recovery-state guards and session check", async () => {
      // Missing session
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null }, error: null } as any);
      
      render(
        <MemoryRouter initialEntries={["/recover-password/new"]}>
          <RecoveryNewPassword />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        // The component redirects or returns null
        expect(screen.queryByText("Create new password")).toBeNull();
      });
    });

    it("verifies password policy and matching logic", () => {
      sessionStorage.setItem("recovery_email", "test@example.com");
      sessionStorage.setItem("recovery_stage", "new_password");
      
      const { container } = render(
        <MemoryRouter>
          <RecoveryNewPassword />
        </MemoryRouter>
      );
      
      const button = screen.getByRole("button", { name: "Reset password" });
      
      const newPwInput = container.querySelector("#new-password") as HTMLInputElement;
      const confirmPwInput = container.querySelector("#confirm-password") as HTMLInputElement;
      
      fireEvent.change(newPwInput, { target: { value: "Short1" } });
      fireEvent.change(confirmPwInput, { target: { value: "Short1" } });
      // Should be enabled because length >= 6 in basic fallback, but let's check
      expect(button).not.toBeDisabled();
      
      // Mismatch
      fireEvent.change(confirmPwInput, { target: { value: "Mismatch2" } });
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  describe("RecoverySuccess", () => {
    it("cleans up recovery state and signs out", async () => {
      sessionStorage.setItem("recovery_email", "test@example.com");
      
      render(
        <MemoryRouter>
          <RecoverySuccess />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem("recovery_email")).toBeNull();
      });
    });
  });
});
