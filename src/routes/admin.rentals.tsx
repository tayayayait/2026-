import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/rentals")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
