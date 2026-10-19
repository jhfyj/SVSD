/*
  The drivers' own voices for the demo script (SVSD video script V4), recorded by the team, in
  public/voices. The video takes are the audio pulled straight out of the clip (AAC, no
  re-encode), so they sound like the real thing. Their playback levels are in lib/radio/levels,
  with the radio's own lines (ElevenLabs, public/voice, lib/radio/scriptVoice), so all of them
  play at one loudness.
*/

/** 4 · Stories on the road: NightOwl's message, unlocked from the road (Flow 2). */
export const NIGHTOWL_BURRITO = "/voices/nightowl-burrito.m4a";

/** 5 · Company: the four turns after the radio introduces them (Flow 3, from NightOwl's side). */
export const MOTHLIGHT_RECITAL = "/voices/mothlight-recital.m4a";
export const NIGHTOWL_AHH_SHUCKS = "/voices/nightowl-ahh-shucks.m4a";
export const MOTHLIGHT_HOPE_SO = "/voices/mothlight-hope-so.m4a";
export const NIGHTOWL_FEEL_YOUR_PAIN = "/voices/nightowl-feel-your-pain.m4a";

/** 6 · A question on the road: NightOwl asks it (Flow 4)… */
export const NIGHTOWL_WHAT_GOT_YOU_THROUGH = "/voices/nightowl-what-got-you-through.m4a";
/** …and @urmom6767's answer. */
export const URMOM_DRIVING_TO_SF = "/voices/urmom-driving-to-sf.m4a";

/**
 * Then, still in Flow 4, you press Drop and tell a story of your own (Emily's "Ashton Ave"
 * recording): it's sorted into a story and left on the road.
 */
export const YOU_WAYMO_SHOWDOWN = {
  src: "/voices/you-waymo-showdown.m4a",
  text: "Funny story actually. Last time I came up to SF, I saw like a showdown between three different Waymo cars. It was actually crazy.",
};
