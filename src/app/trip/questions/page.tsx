import { TripQuestions } from "@/components/trip";

export const metadata = { title: "Questions on the way · SVSD" };

export default function TripQuestionsPage() {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-backdrop">
      <TripQuestions />
    </main>
  );
}
