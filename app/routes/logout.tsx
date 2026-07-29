import { redirect } from "react-router";
import { clearSessionCookieHeader } from "~/lib/auth";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": clearSessionCookieHeader(),
      Location: "/login",
    },
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  return redirect("/");
}

export default function LogoutPage() {
  return null;
}
