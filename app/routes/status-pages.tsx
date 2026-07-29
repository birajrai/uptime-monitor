import { Link, Form, redirect, useLoaderData } from "react-router";
import { eq, desc, and, sql } from "drizzle-orm";
import { Plus, Trash, PencilSimple } from "@phosphor-icons/react";
import { db } from "~/lib/db";
import { statusPages, statusPageMonitors } from "~/lib/schema";
import { requireAuth } from "~/lib/require-auth";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import type { Route } from "./+types/status-pages";

export async function loader({ request }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const pages = await db
    .select({
      id: statusPages.id,
      title: statusPages.title,
      slug: statusPages.slug,
      description: statusPages.description,
      createdAt: statusPages.createdAt,
      monitorCount: sql<number>`(
        SELECT COUNT(*) FROM ${statusPageMonitors}
        WHERE ${statusPageMonitors.statusPageId} = status_pages.id
      )`,
    })
    .from(statusPages)
    .where(eq(statusPages.userId, session.userId))
    .orderBy(desc(statusPages.createdAt));

  return { pages };
}

export async function action({ request }: Route.ActionArgs) {
  const session = requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = parseInt(formData.get("pageId") as string, 10);
    if (isNaN(id)) return redirect("/status-pages");
    await db.delete(statusPages).where(and(eq(statusPages.id, id), eq(statusPages.userId, session.userId))).execute();
  }

  return redirect("/status-pages");
}

export default function StatusPagesList() {
  const { pages } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Status Pages</h1>
          <p className="text-sm text-gray-500">
            Create public status pages to share with your users.
          </p>
        </div>
        <Button asChild>
          <Link to="/status-pages/new">
            <Plus className="h-4 w-4" />
            New Status Page
          </Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GlobeIcon className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-medium">No status pages yet</h3>
            <p className="mb-4 text-sm text-gray-500">
              Create a public status page to keep your users informed.
            </p>
            <Button asChild>
              <Link to="/status-pages/new">
                <Plus className="h-4 w-4" />
                Create Status Page
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/status/${page.slug}`}
                    className="font-medium hover:underline"
                    target="_blank"
                  >
                    {page.title}
                  </Link>
                  <p className="text-sm text-gray-500">
                    /status/{page.slug}
                  </p>
                </div>

                <span className="text-sm text-gray-500">
                  {page.monitorCount} monitor{page.monitorCount !== 1 ? "s" : ""}
                </span>

                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/status-pages/${page.id}/edit`}>
                    <PencilSimple className="h-4 w-4" />
                  </Link>
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete status page</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete "{page.title}"?
                      </DialogDescription>
                    </DialogHeader>
                    <Form method="post" className="flex justify-end gap-2">
                      <input type="hidden" name="pageId" value={page.id} />
                      <input type="hidden" name="intent" value="delete" />
                      <Button type="submit" variant="destructive">
                        Delete
                      </Button>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}
