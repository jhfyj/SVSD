/** US numbers only for now: the Figma shows a fixed +1. */
export const COUNTRY_CODE = "+1";

/** Keep only the 10 national digits. */
export function phoneDigits(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** 1234567890 → 123-456-7890, formatting as you type. */
export function formatPhone(digits: string) {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const isCompletePhone = (digits: string) => digits.length === 10;

/** 1234567890 → XXX-XXX-7890, as on the verification screen. */
export const maskPhone = (digits: string) => `XXX-XXX-${digits.slice(-4)}`;
