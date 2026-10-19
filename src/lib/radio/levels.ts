/*
  One loudness for every voice on the radio, so nothing jumps as the radio's own lines and the
  drivers' recordings take turns. The files themselves are untouched; playVoice applies the gain
  (before the glow reads the voice), and a peak limiter after it stops loud moments from clipping.

  Each gain was set in two passes: from the file's loudness (the LUFS and peak noted beside it,
  from ffmpeg ebur128), then trimmed so every voice's speech plays at about -22 dB RMS in the
  browser (measured at the app's audio output while flows 2 to 4 played). For a new file, start
  from gain = 10 ^ ((-20 - LUFS) / 20) and trim it the same way:
    ffmpeg -nostats -i FILE -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:"
*/

export const VOICE_GAIN: Record<string, number> = {
  // The radio's lines (ElevenLabs), recorded quietly: about -35 to -38 LUFS.
  "/voice/intro-nightowl-mothlight.mp3": 4.6, // -36.0 LUFS, peak -19.7
  "/voice/intro-nightowl-urmom6767.mp3": 4.7, // -36.2, peak -20.9
  "/voice/reply-prompt.mp3": 5.3, // -37.6, peak -19.6
  "/voice/thank-you.mp3": 5.2, // -37.5, peak -21.9
  "/voice/unlock-question.mp3": 4.4, // -35.9, peak -21.3
  "/voice/unlock-question-1.mp3": 3.9, // -34.8, peak -21.3
  "/voice/unlock-question-2.mp3": 5.3, // -37.6, peak -22.2
  // The drivers (their own recordings, lib/radio/demoVoices).
  "/voices/nightowl-burrito.m4a": 1.05, // -17.1, peak -0.8 (trimmed: ends before the "woo")
  "/voices/mothlight-recital.m4a": 3.85, // -28.4, peak -10.1
  "/voices/nightowl-ahh-shucks.m4a": 0.9, // -20.4, peak -3.0
  "/voices/mothlight-hope-so.m4a": 4.45, // -31.4, peak -14.6
  "/voices/nightowl-feel-your-pain.m4a": 1.2, // -23.1, peak -2.7 (trimmed: no "go" before, no "oh wow" after)
  "/voices/nightowl-what-got-you-through.m4a": 1.7, // -25.4, peak -8.9
  "/voices/you-waymo-showdown.m4a": 1.5, // -24.4, peak -5.5
  "/voices/urmom-driving-to-sf.m4a": 3.2, // -27.9, peak -9.5
};
