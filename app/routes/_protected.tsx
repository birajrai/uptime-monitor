import { Outlet } from "react-router";
import { requireAuth } from "~/lib/require-auth";
import Layout from "~/components/layout";
import type { Route } from "./+types/_protected";

export async function loader({ request }: Route.LoaderArgs) {
  const session = requireAuth(request);
  return { session };
}

export default function ProtectedLayout({ loaderData }: Route.ComponentProps) {
  return (
    <Layout session={loaderData.session}>
      <Outlet />
    </Layout>
  );
}
