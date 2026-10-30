import { createFileRoute, redirect } from "@tanstack/react-router";

// A página de vendas agora é a página inicial.
export const Route = createFileRoute("/landing")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
