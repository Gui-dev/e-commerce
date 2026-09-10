import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PixPanel } from "./pix-panel";

const copyMock = vi.fn().mockResolvedValue(undefined);

function installClipboardMock() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: copyMock },
    configurable: true,
  });
}

describe("<PixPanel />", () => {
  it("renders the QR code and copy button", () => {
    installClipboardMock();
    render(
      <PixPanel
        qrCodePngUrl="https://stripe.test/qr.png"
        hostedInstructionsUrl="https://stripe.test/instructions"
        copyCode="000201pix"
      />,
    );

    expect(screen.getByAltText(/qr code pix/i)).toHaveAttribute(
      "src",
      expect.stringContaining("_next/image"),
    );
    expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /instruções/i })).toHaveAttribute(
      "href",
      "https://stripe.test/instructions",
    );
  });

  it("copies the pix code when clicking copy", async () => {
    const user = userEvent.setup();
    installClipboardMock();
    render(<PixPanel qrCodePngUrl="" hostedInstructionsUrl="" copyCode="000201pix" />);

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    expect(copyMock).toHaveBeenCalledWith("000201pix");
    expect(screen.getByRole("button", { name: /copiado/i })).toBeInTheDocument();
  });
});
