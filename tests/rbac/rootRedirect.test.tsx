// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import RootRedirect from "@/components/RootRedirect";

const navigateMock = vi.fn();

interface MockUserState {
  user: any;
  isLoggedIn: boolean;
  isLoading: boolean;
  authStatus: "initializing" | "authenticating" | "authenticated" | "unauthenticated" | "error";
  lastError: string | null;
}

let mockUserState: MockUserState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  authStatus: "unauthenticated",
  lastError: null,
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: {}, search: "", hash: "" }),
  };
});

vi.mock("@/contexts/SupabaseUserContext", () => ({
  useUser: () => mockUserState,
}));

vi.mock("@/pages/Index", () => ({
  default: () => <div data-testid="index-page" />,
}));

describe("RootRedirect RBAC", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("redirects org admins to the org dashboard", () => {
    mockUserState = {
      user: {
        hasTemporaryPassword: false,
        isOrgAdmin: true,
        isMaigonAdmin: false,
        organization: { id: "org-123", name: "Acme" },
      },
      isLoggedIn: true,
      isLoading: false,
      authStatus: "authenticated",
      lastError: null,
    };

    render(<RootRedirect />);

    expect(navigateMock).toHaveBeenCalledWith("/org-admin", {
      replace: true,
    });
  });

  it("redirects maigon admins to the main dashboard", () => {
    mockUserState = {
      user: {
        hasTemporaryPassword: false,
        isOrgAdmin: false,
        isMaigonAdmin: true,
        organization: null,
      },
      isLoggedIn: true,
      isLoading: false,
      authStatus: "authenticated",
      lastError: null,
    };

    render(<RootRedirect />);

    expect(navigateMock).toHaveBeenCalledWith("/dashboard", {
      replace: true,
    });
  });

  it("redirects regular users to the user dashboard", () => {
    mockUserState = {
      user: {
        hasTemporaryPassword: false,
        isOrgAdmin: false,
        isMaigonAdmin: false,
        organization: null,
      },
      isLoggedIn: true,
      isLoading: false,
      authStatus: "authenticated",
      lastError: null,
    };

    render(<RootRedirect />);

    expect(navigateMock).toHaveBeenCalledWith("/user-dashboard", {
      replace: true,
    });
  });
});
