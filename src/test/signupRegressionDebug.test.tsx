import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import App from "../App";

describe("SignUp Page Mount Test", () => {
  it("renders /signup route and captures any mount/render exception", async () => {
    // Spy on console.error to capture exact ErrorBoundary or React error logs
    const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      console.log("[captured console.error]", ...args);
    });

    // Override window.location to /signup before App mounts
    window.history.pushState({}, "SignUp", "/signup");

    try {
      render(<App />);
    } catch (err: any) {
      console.log("Uncaught render throw:", err?.stack || err);
    }

    const errorScreen = screen.queryByText(/Something went wrong/i);
    if (errorScreen) {
      console.log("ErrorBoundary is rendering!");
    }

    errorSpy.mockRestore();
  });
});


