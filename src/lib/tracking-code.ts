import { randomInt } from "node:crypto";

const TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createTrackingCode(length = 6) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += TRACKING_CODE_ALPHABET[randomInt(0, TRACKING_CODE_ALPHABET.length)];
  }
  return value;
}
