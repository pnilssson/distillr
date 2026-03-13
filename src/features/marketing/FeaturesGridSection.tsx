import {
  Library,
  MessageSquare,
  Search,
  Download,
  Youtube,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Library,
    title: "Persistent libraries",
    desc: "Your content stays. Add once, search forever. Libraries grow automatically as you add more.",
  },
  {
    icon: MessageSquare,
    title: "Cross-video chat",
    desc: "Ask questions across your whole library. Answers come with timestamp citations, not guesses.",
  },
  {
    icon: Search,
    title: "Semantic search",
    desc: "Find anything by meaning, not just keywords. Surface ideas you forgot you had.",
  },
  {
    icon: Download,
    title: "Structured exports",
    desc: "Summaries, transcripts, and chat logs — formatted and ready to use in your workflow.",
  },
  {
    icon: Youtube,
    title: "Channels & playlists",
    desc: "Add entire channels or playlists at once. New uploads are picked up automatically.",
  },
  {
    icon: Shield,
    title: "Your data, isolated",
    desc: "Libraries are private to your account. Nothing is shared, nothing is public by default.",
  },
];

export function FeaturesGridSection() {
  return (
    <section className="border-t mx-auto w-full max-w-5xl px-6 py-24">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Features
      </p>
      <h2 className="mb-16 max-w-md font-serif text-3xl sm:text-4xl">
        Everything you need to stop losing knowledge
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col gap-2 rounded-xl border bg-card p-5"
          >
            <Icon size={18} className="mb-1 text-muted-foreground" />
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
