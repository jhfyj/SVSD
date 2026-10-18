import { RadioIntro, RadioScreen } from "@/components/radio";

export const metadata = { title: "Radio · SVSD" };

export default function RadioPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-black">
      <RadioIntro>
        <RadioScreen />
      </RadioIntro>
    </main>
  );
}
