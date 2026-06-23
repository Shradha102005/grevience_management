import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Governance Portal — CIVICOS AI" },
      { name: "description", content: "Unified enterprise governance dashboard for citizen services." },
    ],
  }),
  beforeLoad: () => {
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
