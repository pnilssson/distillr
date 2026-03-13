import { Check } from "lucide-react";

const checkpoints = [
  "Answers grounded in your content, not the internet",
  "Timestamp-linked citations you can verify",
  "Full conversation history saved automatically",
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
            Ask questions across every video you&rsquo;ve ever watched.
          </h2>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Distillr&rsquo;s AI answers from your library — not the internet.
            Every answer links back to the exact timestamp so you can verify,
            revisit, and go deeper.
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

        {/* Chat UI Mockup */}
        <div className="rounded-2xl border bg-card p-1 shadow-lg">
          <div className="min-h-64 space-y-3 rounded-xl bg-muted/40 p-4">
            {/* User message */}
            <div className="flex gap-3">
              <div className="h-6 w-6 shrink-0 rounded-full bg-muted" />
              <div className="max-w-xs rounded-lg border bg-background p-2 text-xs text-muted-foreground">
                What are the main concepts from the Transformer architecture
                videos?
              </div>
            </div>
            {/* Assistant message */}
            <div className="flex flex-row-reverse gap-3">
              <div className="h-6 w-6 shrink-0 rounded-full bg-foreground" />
              <div className="max-w-xs space-y-2 rounded-lg bg-foreground p-3 text-xs text-background">
                <p>
                  The core concept is the attention mechanism, which lets the
                  model weigh relationships between all tokens simultaneously
                  rather than sequentially...
                </p>
                <p className="text-xs text-background/60">
                  Sources: 3 videos · 5 timestamps
                </p>
              </div>
            </div>
            {/* Citation chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Karpathy 12:34",
                "Illustrated Transformer 8:21",
                "Attention Paper 5:44",
              ].map((cite) => (
                <span
                  key={cite}
                  className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {cite}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
