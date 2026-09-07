import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoletoPanel } from "./boleto-panel";

describe("<BoletoPanel />", () => {
  it("renders the download link and instructions", () => {
    render(
      <BoletoPanel
        hostedVoucherUrl="https://stripe.test/boleto"
        onPaymentSuccess={() => {}}
      />,
    );

    expect(
      screen.getByRole("link", { name: /baixar boleto/i }),
    ).toHaveAttribute("href", "https://stripe.test/boleto");
    expect(screen.getByText(/pagar/i)).toBeInTheDocument();
  });
});
