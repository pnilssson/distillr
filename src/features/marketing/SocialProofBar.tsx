export function SocialProofBar() {
  const messages = [
    "Used by analysts tracking 10-20 channels seriously",
    "Answers include timestamp citations back to source videos",
    "Libraries update as channels publish new uploads",
    "Built for researchers, writers, and market operators",
    "Paste once - query forever across your full archive",
  ];

  return (
    <section className="border-y bg-muted/20 py-5">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="animate-marketing-marquee motion-reduce:animate-none">
            {[...messages, ...messages].map((message, index) => (
              <span
                key={`${message}-${index}`}
                className="mx-2 inline-flex shrink-0 items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {message}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
