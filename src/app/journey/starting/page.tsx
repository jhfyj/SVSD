import { Splash } from "./Splash";

export const metadata = { title: "Starting your radio · SVSD" };

export default function StartingPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-black">
      <Splash />
    </main>
  );
}
