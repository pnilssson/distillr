import Link from "next/link";
import { Library, MessageSquare, Download } from "lucide-react";

import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/features/navigation/MarketingNav";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col">
      <MarketingNav>
        <Button asChild size="sm">
          <Link href={user ? "/dashboard" : "/login"}>
            {user ? "Go to dashboard" : "Sign in"}
          </Link>
        </Button>
      </MarketingNav>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center px-6 py-16">
        <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Your YouTube watching,
          <br />
          turned into something durable.
        </h1>
        <p className="mb-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          Add channels, playlists, or videos. Distillr processes the transcripts,
          builds a searchable knowledge base, and lets you ask questions across
          everything you have collected.
        </p>
        <p className="mb-10 text-sm text-muted-foreground">
          Works with channels, playlists, and individual videos.
        </p>
        <Button asChild size="lg">
          <Link href={user ? "/dashboard" : "/login"}>
            {user ? "Go to dashboard" : "Get started for free"}
          </Link>
        </Button>

        <div className="mt-20 w-full max-w-xl divide-y">
          <div className="flex items-start gap-4 py-5">
            <Library size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Persistent knowledge libraries</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Add channels, playlists, or videos. They stay, growing over time.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 py-5">
            <MessageSquare size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Chat across every video</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ask questions. Get answers with timestamp-linked citations.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 py-5">
            <Download size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Export what you learned</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Summaries, transcripts, and full chat sessions - not just raw files.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
