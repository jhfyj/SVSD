/*
  The drivers' own voices for the demo script (SVSD video script V4), recorded by the team, in
  public/voices. The video takes are the audio pulled straight out of the clip (AAC, no
  re-encode), so they sound like the real thing. They were recorded at different levels
  (-31 to -17 LUFS), so each one carries a playback gain that brings it to about -20 LUFS without
  clipping its peaks. The radio's own lines (ElevenLabs) stay in public/voice (lib/radio/scriptVoice).
*/

/** A driver's recording and how much to turn it up (or down) so every voice sits at one level. */
export type DemoVoice = { src: string; gain: number };

/** 4 · Stories on the road: NightOwl's message, unlocked from the road (Flow 2). */
export const NIGHTOWL_BURRITO: DemoVoice = { src: "/voices/nightowl-burrito.m4a", gain: 0.71 };

/** 5 · Company: the four turns after the radio introduces them (Flow 3, from NightOwl's side). */
export const MOTHLIGHT_RECITAL: DemoVoice = { src: "/voices/mothlight-recital.m4a", gain: 2.6 };
export const NIGHTOWL_AHH_SHUCKS: DemoVoice = { src: "/voices/nightowl-ahh-shucks.m4a", gain: 1.05 };
export const MOTHLIGHT_HOPE_SO: DemoVoice = { src: "/voices/mothlight-hope-so.m4a", gain: 3.6 };
export const NIGHTOWL_FEEL_YOUR_PAIN: DemoVoice = { src: "/voices/nightowl-feel-your-pain.m4a", gain: 1.2 };

/** 6 · A question on the road: NightOwl asks it (Flow 4)… */
export const NIGHTOWL_WHAT_GOT_YOU_THROUGH: DemoVoice = { src: "/voices/nightowl-what-got-you-through.m4a", gain: 1.85 };
/** …and @urmom6767's answer. */
export const URMOM_DRIVING_TO_SF: DemoVoice = { src: "/voices/urmom-driving-to-sf.m4a", gain: 2.45 };
