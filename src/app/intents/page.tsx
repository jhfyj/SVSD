import { redirect } from "next/navigation";

/**
 * The old "What brings you here today" step. Intent is now picked when you flip the radio on
 * (it's only used to match calls), so old links to /intents go straight to Destination.
 */
export default function IntentsPage() {
  redirect("/journey");
}
