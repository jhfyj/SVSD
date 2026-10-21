/**
 * Switches for the prototype.
 *
 * FAKE_MIC: the demo never opens the real microphone, so no browser ever asks for it. Allowing the
 * microphone just turns the row on; recording (a drop, a reply) plays a stand-in voice for a few
 * seconds so the waveform moves and it sends itself once it goes quiet; and speech-to-text stays
 * off, so a drop uses the sample lines and "yes or no?" hears the stand-in voice as a yes.
 * Set it to false to use the real microphone again.
 */
export const FAKE_MIC = true;

/**
 * FAKE_LOCATION: the demo never reads the real location, so no browser ever asks for it. Allowing
 * location just turns the row on; you're always where the script's drive starts (Santa Monica), so
 * Destination draws your trail from there and the radio's map shows you there before a trip; and
 * on the road the map drives the route on its own, as it does with no location to follow.
 * Set it to false to use the real location again.
 */
export const FAKE_LOCATION = true;
