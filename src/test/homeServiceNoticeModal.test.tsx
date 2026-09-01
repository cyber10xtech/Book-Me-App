import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import HomeServiceNoticeModal from "../components/HomeServiceNoticeModal";

describe("HomeServiceNoticeModal", () => {
  it("renders nothing when open is false", () => {
    render(<HomeServiceNoticeModal open={false} onCancel={() => {}} onUnderstand={() => {}} />);
    expect(screen.queryByText("Home Service Notice")).toBeNull();
  });

  it("renders exact reference image title, body text, and action buttons when open is true", () => {
    const handleCancel = vi.fn();
    const handleUnderstand = vi.fn();

    render(
      <HomeServiceNoticeModal
        open={true}
        onCancel={handleCancel}
        onUnderstand={handleUnderstand}
      />
    );

    // Title
    expect(screen.getByText("Home Service Notice")).toBeDefined();

    // Paragraph 1
    expect(
      screen.getByText(
        /You selected “At Home”. Please note that the service provider can attach any additional charge they see fit for coming to your location./i
      )
    ).toBeDefined();

    // Paragraph 2
    expect(
      screen.getByText(/This charge is not included in the price listed for the service./i)
    ).toBeDefined();

    // Cancel and I Understand buttons
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    const understandBtn = screen.getByRole("button", { name: "I Understand" });

    expect(cancelBtn).toBeDefined();
    expect(understandBtn).toBeDefined();

    // Test clicking Cancel
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    // Test clicking I Understand
    fireEvent.click(understandBtn);
    expect(handleUnderstand).toHaveBeenCalledTimes(1);
  });
});
