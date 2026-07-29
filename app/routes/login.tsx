import { Form, redirect, useActionData, Link } from "react-router";
import { compareSync } from "bcryptjs";
import { db } from "~/lib/db";
import { users } from "~/lib/schema";
import {
  createSessionCookie,
  getSessionFromRequest,
  getSessionCookieHeader,
} from "~/lib/auth";
import { eq } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = getSessionFromRequest(request);
  if (session) return redirect("/");

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) return redirect("/setup");

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !compareSync(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  const cookieHeader = getSessionCookieHeader({
    userId: user.id,
    email: user.email,
  });

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": cookieHeader,
      Location: "/",
    },
  });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Sign in to your uptime monitor.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {actionData?.error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {actionData.error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
