const PAYMENT_MODES = Object.freeze({
    PREPAYMENT: "Prepayment",
    PAY_LATER: "Pay Later",
});

export default PAYMENT_MODES;

/** Normalize request body value; returns null if invalid. */
export function parsePaymentMode(value) {
    if (value === undefined || value === null || value === "") {
        return PAYMENT_MODES.PAY_LATER;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "prepayment") return PAYMENT_MODES.PREPAYMENT;
    if (normalized === "pay later" || normalized === "pay_later" || normalized === "paylater") {
        return PAYMENT_MODES.PAY_LATER;
    }
    return null;
}
