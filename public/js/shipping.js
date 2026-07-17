/*
  Simple zone-based shipping calculator.

  This is intentionally a flat-rate table, not a live courier API (that's a
  bigger integration for later, e.g. GIG Logistics / Sendbox). Edit the
  amounts below whenever your delivery costs change -- nothing else in the
  app needs to change.

  State names must match what the "country-state-city" library returns
  (used by location-service.js), which is why they're spelled out in full.
*/

const LAGOS_FEE = 2500;
const NEARBY_STATE_FEE = 4000;
const REST_OF_NIGERIA_FEE = 5500;

// States that border Lagos / are cheap & fast to reach from it.
const NEARBY_STATES = [
  "Ogun",
  "Oyo",
  "Osun",
];

/**
 * Returns a flat delivery fee in Naira, or null when the destination is
 * outside Nigeria (international shipping needs a manual quote for now).
 */
export function getShippingFee(country, state) {
  if (!country || country.trim().toLowerCase() !== "nigeria") {
    return null;
  }

  if (!state) return null;

  const normalized = state.trim().toLowerCase();

  if (normalized === "lagos") {
    return LAGOS_FEE;
  }

  if (NEARBY_STATES.some((s) => s.toLowerCase() === normalized)) {
    return NEARBY_STATE_FEE;
  }

  return REST_OF_NIGERIA_FEE;
}

/**
 * Human-readable line for the order summary / WhatsApp message.
 */
export function getShippingFeeLabel(country, state) {
  const fee = getShippingFee(country, state);

  if (fee === null) {
    return {
      fee: 0,
      text: "To be confirmed via WhatsApp",
    };
  }

  return {
    fee,
    text: `₦${fee.toLocaleString()}`,
  };
}