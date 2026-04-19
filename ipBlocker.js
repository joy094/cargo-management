// IP blocking feature removed per request — placeholder module.
export const INFO = "IP blocking removed";
export async function isIpBlocked() {
  return { blocked: false, count: 0 };
}
export async function incrementIpFail() {
  return { blocked: false, count: 0 };
}
export async function resetIpFails() {
  return;
}
export async function initIpBlocker() {
  return;
}
