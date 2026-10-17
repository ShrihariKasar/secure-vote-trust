import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/voter/elections/$id")({
  component: VoterElectionLayout,
});

function VoterElectionLayout() {
  return <Outlet />;
}
