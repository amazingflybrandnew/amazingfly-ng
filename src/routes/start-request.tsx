import { createFileRoute, redirect } from "@tanstack/react-router";

type StartRequestSearch = {
  service?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

export const Route = createFileRoute("/start-request")({
  validateSearch: (search: Record<string, unknown>): StartRequestSearch => ({
    ...(typeof search["service"] === "string" ? { service: search["service"] } : {}),
    ...(typeof search["from"] === "string" ? { from: search["from"] } : {}),
    ...(typeof search["to"] === "string" ? { to: search["to"] } : {}),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/request",
      search: search.service ? { service: search.service } : {},
    });
  },
});
