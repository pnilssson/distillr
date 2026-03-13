const exportFormats = ["Markdown", "PDF", "TXT", "Full chat log"];

const exportPreview = [
  { type: "heading", text: "## Summary: Transformer Architecture" },
  { type: "bold", text: "Key concepts:" },
  { type: "item", text: "- Self-attention: each token attends to all others" },
  {
    type: "item",
    text: "- Multi-head attention: parallel attention across subspaces",
  },
  {
    type: "item",
    text: "- Positional encoding: injects position information",
  },
  { type: "spacer", text: "" },
  {
    type: "cite",
    text: "Sources: [Video 1] [Video 2]",
  },
];

export function FeatureShowcaseDark() {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-24 lg:py-36">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Export mockup */}
          <div className="space-y-1.5 rounded-xl border border-background/10 bg-background/5 p-5 font-mono text-xs">
            {exportPreview.map(({ type, text }, i) =>
              type === "spacer" ? (
                <div key={i} className="h-2" />
              ) : (
                <p
                  key={i}
                  className={
                    type === "heading" || type === "cite"
                      ? "text-background/40"
                      : "text-background/70"
                  }
                >
                  {text}
                </p>
              )
            )}
          </div>

          {/* Text */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-background/50">
              Export
            </p>
            <h2 className="mb-4 font-serif text-3xl leading-tight text-background sm:text-4xl">
              Export structured knowledge, not raw files.
            </h2>
            <p className="mb-6 leading-relaxed text-background/60">
              Get summaries, structured notes, full transcripts, and your entire
              chat history, formatted and ready to paste into Notion, Obsidian,
              or anywhere else you work.
            </p>
            <div className="flex flex-wrap gap-2">
              {exportFormats.map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-full border border-background/20 px-3 py-1 text-xs text-background/70"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
