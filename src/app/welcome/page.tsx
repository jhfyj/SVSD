import { TuningIn } from "@/components/onboarding/TuningIn";

export const metadata = { title: "Caravan · SVSD" };

/** Flow 1 opens here: the radio tunes in to Caravan, then hands over to the first overview card. */
export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <TuningIn next="/overview?step=1" />
    </main>
  );
}
