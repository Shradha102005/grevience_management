import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Governance Portal — CivicSaathi" },
      { name: "description", content: "Unified enterprise governance dashboard for citizen services." },
    ],
  }),
  beforeLoad: () => {
    // Guard for SSR — localStorage is not available on the server
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <PortalShell>
      <Outlet />
    </PortalShell>
  ),
});
