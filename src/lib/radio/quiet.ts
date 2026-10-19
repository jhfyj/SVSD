/*
  Voice notes send themselves once you go quiet, the way a voice memo does: a drop, and your reply
  to a message on the road. Both recorders share this clock so they behave the same way and read
  the same on the LCD.
*/

/** Go quiet this long and it sends itself (or you tap send). */
export const QUIET_MS = 10_000;
/** Mic level (0–1, ordinary speech sits around 0.3–0.8) that counts as you talking. */
export const VOICE_LEVEL = 0.12;

export type QuietReading = {
  /** You've said something since the mic went live. */
  spoke: boolean;
  /** ms until it sends itself, for the back half of the wait only (so a breath doesn't flash it); null while talking. */
  sendsIn: number | null;
  /** Quiet for the whole wait: time to send (or, if you never spoke, to throw it away). */
  done: boolean;
};

/**
 * Starts the quiet clock when the mic goes live. Call the returned reader on every tick with the
 * mic's level: talking resets the clock.
 */
export function quietClock(start = Date.now()) {
  let lastVoice = start;
  let spoke = false;
  return (level: number, now = Date.now()): QuietReading => {
    if (level > VOICE_LEVEL) {
      lastVoice = now;
      spoke = true;
    }
    const quiet = now - lastVoice;
    return { spoke, sendsIn: quiet >= QUIET_MS / 2 ? QUIET_MS - quiet : null, done: quiet >= QUIET_MS };
  };
}

/** The line under a recorder on the LCD: how to send, or the count once you've gone quiet. */
export const quietHint = (sendsIn: number | null) =>
  sendsIn === null ? `Tap send or stop speaking for ${QUIET_MS / 1000} sec` : `Sending in ${Math.max(1, Math.ceil(sendsIn / 1000))}…`;
