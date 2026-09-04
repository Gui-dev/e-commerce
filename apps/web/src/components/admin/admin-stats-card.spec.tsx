import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminStatsCard } from "./admin-stats-card";

describe("AdminStatsCard", () => {
  it("renders title and value", () => {
    render(<AdminStatsCard title="Total Pedidos" value={42} />);
    expect(screen.getByText("Total Pedidos")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders description when provided", () => {
    render(<AdminStatsCard title="Receita" value="R$ 1.000" description="ultimo mes" />);
    expect(screen.getByText("ultimo mes")).toBeDefined();
  });
});
