import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
<<<<<<< HEAD
      { title: "Governance Portal — CIVICOS AI" },
      {
        name: "description",
        content:
          "Unified enterprise governance dashboard for citizen services.",
      },
=======
      { title: "Governance Portal — CivicSaathi" },
      { name: "description", content: "Unified enterprise governance dashboard for citizen services." },
>>>>>>> 4b6b11d5b8430477f7a10a0fb94cf381a9b34171
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
