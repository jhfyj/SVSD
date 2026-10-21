"use client";

import { useCallback, useEffect, useState } from "react";
import { FAKE_MIC } from "@/lib/prototype";

/**
 * Browser permissions the radio needs: the microphone to talk, notifications for incoming
 * messages, location for the trail. Browsers only show their prompt once; after a "Block" the
 * visitor has to turn it back on in their phone or browser settings.
 */
export type PermissionKind = "microphone" | "notifications" | "location";
export type PermissionState = "checking" | "prompt" | "granted" | "denied" | "unsupported";

/** The fake mic remembers it was allowed on this device, like a real browser would. */
const FAKE_MIC_KEY = "svsd-fake-mic";

function supported(kind: PermissionKind) {
  if (typeof window === "undefined") return false;
  if (kind === "microphone" && FAKE_MIC) return true;
  if (kind === "microphone") return !!navigator.mediaDevices?.getUserMedia;
  if (kind === "notifications") return "Notification" in window;
  return "geolocation" in navigator;
}

const QUERY_NAME: Record<PermissionKind, string> = {
  microphone: "microphone",
  notifications: "notifications",
  location: "geolocation",
};

/** Current state without prompting. Falls back to "prompt" where the Permissions API can't tell. */
async function query(kind: PermissionKind): Promise<{ state: PermissionState; status?: PermissionStatus }> {
  if (!supported(kind)) return { state: "unsupported" };
  if (kind === "microphone" && FAKE_MIC) {
    try {
      return { state: localStorage.getItem(FAKE_MIC_KEY) === "granted" ? "granted" : "prompt" };
    } catch {
      return { state: "prompt" };
    }
  }
  if (kind === "notifications") {
    const p = Notification.permission;
    return { state: p === "default" ? "prompt" : p };
  }
  try {
    const status = await navigator.permissions.query({ name: QUERY_NAME[kind] as PermissionName });
    return { state: status.state, status };
  } catch {
    return { state: "prompt" };
  }
}

/** Shows the browser's prompt and resolves with the answer. */
async function request(kind: PermissionKind): Promise<PermissionState> {
  if (!supported(kind)) return "unsupported";
  if (kind === "microphone" && FAKE_MIC) {
    // No browser prompt in the prototype: a beat, as if it were answered, then it's on.
    await new Promise((r) => setTimeout(r, 300));
    try {
      localStorage.setItem(FAKE_MIC_KEY, "granted");
    } catch {}
    return "granted";
  }
  if (kind === "microphone") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return "granted";
    } catch {
      return "denied";
    }
  }
  if (kind === "notifications") {
    const p = await Notification.requestPermission();
    return p === "default" ? "prompt" : p;
  }
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      (e) => resolve(e.code === e.PERMISSION_DENIED ? "denied" : "granted"),
      { timeout: 15000, maximumAge: 60000 },
    ),
  );
}

/** One permission's state, kept up to date if it changes in settings, plus a way to ask for it. */
export function usePermission(kind: PermissionKind) {
  const [state, setState] = useState<PermissionState>("checking");

  useEffect(() => {
    let status: PermissionStatus | undefined;
    const onChange = () => status && setState(status.state);
    let cancelled = false;
    query(kind).then((r) => {
      if (cancelled) return;
      setState(r.state);
      status = r.status;
      status?.addEventListener("change", onChange);
    });
    return () => {
      cancelled = true;
      status?.removeEventListener("change", onChange);
    };
  }, [kind]);

  const ask = useCallback(async () => setState(await request(kind)), [kind]);
  return { state, ask };
}
