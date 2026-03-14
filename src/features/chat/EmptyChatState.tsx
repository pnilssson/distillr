const SUGGESTIONS = [
  "What are the main themes across these videos?",
  "What tools or tactics are mentioned most?",
  "What questions does this content answer?",
  "Summarize the key points in this library.",
];

type EmptyChatStateProps = {
  onSuggestion: (text: string) => void;
};

export function EmptyChatState({ onSuggestion }: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-base font-semibold">Ask anything about this library</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Questions are answered across all ready videos.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestion(suggestion)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
