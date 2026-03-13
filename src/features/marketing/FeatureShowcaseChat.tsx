import { Check } from "lucide-react";

const checkpoints = [
  "Answers from your videos, not generic AI knowledge",
  "Works with content published yesterday, not just years ago",
  "Your full conversation history saved automatically",
];

export function FeatureShowcaseChat() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24">
      <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
        {/* Text */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Chat
          </p>
          <h2 className="mb-4 font-serif text-3xl leading-tight sm:text-4xl">
            Get answers from your content, not the whole internet.
          </h2>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            ChatGPT is powerful but gives you generic answers based on
            everything it knows. Distillr only answers from the videos and
            channels you added. Ask about something your favorite creator
            published last week - Distillr knows. ChatGPT does not.
          </p>
          <ul className="space-y-2">
            {checkpoints.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check size={14} className="mt-0.5 shrink-0 text-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* PLACEHOLDER: Replace with actual chat screenshot */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
          <div className="border-b bg-muted/40 px-4 py-3">
            <p className="text-xs font-medium">Chat with your library</p>
          </div>
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 px-6 py-5">
              <p className="text-sm font-medium text-muted-foreground">
                Chat screenshot placeholder
              </p>
              <p className="mt-1.5 max-w-xs text-xs text-muted-foreground/60">
                Replace with: chat interface showing a question and answer from
                a specific video
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
