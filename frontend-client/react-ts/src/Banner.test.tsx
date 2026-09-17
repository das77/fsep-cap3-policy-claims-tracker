import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TOKEN_STORAGE_KEY } from "./api";
import { AuthProvider, USER_STORAGE_KEY } from "./AuthContext";
import Banner from "./Banner";
import type { User } from "./types";

const mockUser: User = {
  _id: "user-1",
  name: "Alice Adjuster",
  email: "alice@policyclaims.com",
  role: "adjuster",
  createdAt: new Date().toISOString(),
};

function renderBanner() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Banner />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Banner", () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "test-token");
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
  });

  it("renders navigation links and the app name", () => {
    renderBanner();

    expect(screen.getByText("Policy Claims Tracker")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /claims/i })).toHaveAttribute("href", "/claims");
    expect(screen.getByRole("link", { name: /policies/i })).toHaveAttribute("href", "/policies");
  });

  it("renders nothing when there is no logged-in user", () => {
    localStorage.clear();

    const { container } = renderBanner();

    expect(container).toBeEmptyDOMElement();
  });
});
