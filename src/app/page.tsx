import Link from "next/link";

import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">Distillr</span>
        {user ? (
          <Button asChild size="sm">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </nav>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center px-6 py-24">
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          YouTube knowledge base
        </p>
        <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Your YouTube watching,
          <br />
          turned into something durable.
        </h1>
        <p className="mb-10 max-w-xl text-base leading-relaxed text-muted-foreground">
          Add channels, playlists, or videos. Distillr processes the transcripts,
          builds a searchable knowledge base, and lets you ask questions across
          everything you have collected.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={user ? "/dashboard" : "/login"}>
              {user ? "Go to dashboard" : "Get started for free"}
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-8 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-sm font-medium">Cross-video search</p>
            <p className="text-sm text-muted-foreground">
              Ask questions across hundreds of videos at once. Get answers with
              exact timestamp citations.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Named libraries</p>
            <p className="text-sm text-muted-foreground">
              Organize by topic, channel, or project. Libraries grow over time,
              not session by session.
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Export structured knowledge</p>
            <p className="text-sm text-muted-foreground">
              Export summaries, topic reports, and chat sessions. Not raw
              transcripts.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
