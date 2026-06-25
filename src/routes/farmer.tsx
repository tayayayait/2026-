import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/farmer")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
