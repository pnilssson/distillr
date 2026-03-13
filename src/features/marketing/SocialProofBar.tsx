const quotes = [
  {
    text: "I follow 30 channels about AI and finance. Now I can actually find what I half-remember watching six months ago.",
    name: "Alex R.",
    role: "Independent researcher",
  },
  {
    text: "My team uses it to stay on top of industry channels. We stopped sending each other video links and just chat the library instead.",
    name: "Maria L.",
    role: "Content strategist",
  },
];

export function SocialProofBar() {
  return (
    <section className="border-y bg-muted/30 py-16">
      <div className="mx-auto w-full max-w-5xl px-6">
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          What people are saying
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {quotes.map(({ text, name, role }) => (
            <div
              key={name}
              className="flex flex-col gap-4 rounded-xl border bg-card p-5"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{text}&rdquo;
              </p>
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
