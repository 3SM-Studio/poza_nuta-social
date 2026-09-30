import "server-only";

const text = (value: string | undefined) => value?.trim() || null;

export function privacyConfig() {
  return {
    controller: text(process.env.PRIVACY_CONTROLLER_NAME),
    address: text(process.env.PRIVACY_CONTROLLER_ADDRESS),
    contact: text(process.env.PRIVACY_CONTACT_EMAIL),
    recipients: text(process.env.PRIVACY_RECIPIENTS),
    transfers: text(process.env.PRIVACY_TRANSFERS),
    retention: text(process.env.PRIVACY_RETENTION),
  };
}
