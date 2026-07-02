import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") throw redirect({ to: "/login" });
    const token = localStorage.getItem("taxease_token");
    if (!token) throw redirect({ to: "/login" });

    try {
      const userJson = localStorage.getItem("taxease_user");
      const user = userJson ? JSON.parse(userJson) : null;
      if (user?.role === "client") throw redirect({ to: "/portal" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
