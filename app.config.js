// Wraps app.json. Apple Pay needs the app built with an Apple merchant ID, and that ID is yours to create, so it comes from
// the build environment instead of being baked in: set APPLE_MERCHANT_ID (e.g. in EAS) to switch Apple Pay on.
// Without it the app builds exactly as before and Apple Pay simply does not appear (Google Pay and cards are unaffected).
module.exports = ({ config }) => {
  const merchantId = process.env.APPLE_MERCHANT_ID || '';
  return {
    ...config,
    extra: { ...(config.extra || {}), stripeMerchantId: merchantId },
    plugins: (config.plugins || []).map((p) =>
      Array.isArray(p) && p[0] === '@stripe/stripe-react-native' && merchantId ? [p[0], { ...p[1], merchantIdentifier: merchantId }] : p,
    ),
  };
};
