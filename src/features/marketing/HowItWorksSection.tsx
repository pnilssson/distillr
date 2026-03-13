import { PlusCircle, Cpu, MessageSquare } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: PlusCircle,
    title: "Add your content",
    desc: "Paste a YouTube channel URL, playlist, or individual video. Distillr does the rest.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "Distillr processes it",
    desc: "Transcripts are extracted, chunked, and embedded. Your library is ready in minutes.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Ask anything",
    desc: "Chat across your entire library. Every answer comes with timestamp-linked citations.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        How it works
      </p>
      <h2 className="mb-16 text-center font-serif text-3xl sm:text-4xl">
        Three steps to your knowledge base
      </h2>

      <div className="grid gap-10 sm:grid-cols-3">
        {steps.map(({ step, icon: Icon, title, desc }) => (
          <div key={step} className="flex flex-col gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {step}
            </span>
            <Icon size={20} className="text-foreground" />
            <p className="font-medium">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
