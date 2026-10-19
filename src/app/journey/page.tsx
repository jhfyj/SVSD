import { redirect } from "next/navigation";

/** The old Destination step. The search and the map now sit at the top of the start screen. */
export default function JourneyPage() {
  redirect("/");
}
