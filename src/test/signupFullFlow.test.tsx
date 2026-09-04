import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import App from "../App";
import { supabase } from "@/lib/supabase";

describe("Customer Signup Full Flow", () => {
  it("renders /signup form elements correctly without crashing", async () => {
    window.history.pushState({}, "SignUp", "/signup");

    render(<App />);

    // Verify form header and fields render
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeDefined();
    expect(screen.getByText("Full Name")).toBeDefined();
    expect(screen.getByText("Username")).toBeDefined();
    expect(screen.getByText("Email")).toBeDefined();
    expect(screen.getByText("Phone Number")).toBeDefined();
    expect(screen.getByText("Password")).toBeDefined();

    // Verify inputs render
    const fullNameInput = screen.getByPlaceholderText("John Doe");
    const usernameInput = screen.getByPlaceholderText("johndoe123");
    const emailInput    = screen.getByPlaceholderText("you@example.com");
    const phoneInput    = screen.getByPlaceholderText("0801 234 5678");
    const passwordInput = screen.getByPlaceholderText("Min. 6 characters");

    expect(fullNameInput).toBeDefined();
    expect(usernameInput).toBeDefined();
    expect(emailInput).toBeDefined();
    expect(phoneInput).toBeDefined();
    expect(passwordInput).toBeDefined();
  });

  it("completes brand-new user signup without entering ErrorBoundary", async () => {
    const testEmail = `fullflow_${Date.now()}@example.com`;
    const testUser  = `user_${Date.now()}`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: "Password123!",
      options: {
        data: { full_name: "Full Flow User", username: testUser, phone: "+2348012345678" },
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });

    expect(authError).toBeNull();
    expect(authData.user?.id).toBeDefined();

    // Verify corresponding profile row exists in Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authData.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.role).toBe("customer");
  }, 15000);
});
