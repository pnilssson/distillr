import { CenteredSpinner } from "@/components/CenteredSpinner";

export default function AppLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <CenteredSpinner label="Loading page" />
    </main>
  );
}
