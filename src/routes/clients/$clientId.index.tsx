import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clients/$clientId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/clients/$clientId/$tab",
      params: { clientId: params.clientId, tab: "home" },
      replace: true,
    });
  },
});