// Wraps app.json. Apple Pay needs the app built with an Apple merchant ID, and that ID is yours to create, so it comes from
// the build environment instead of being baked in: set APPLE_MERCHANT_ID (e.g. in EAS) to switch Apple Pay on.
// Without it the app builds exactly as before and Apple Pay simply does not appear (Google Pay and cards are unaffected).
//
// Release builds talk to the API over HTTPS only. A release build pointed at a local http:// server (testing against a
// laptop on the LAN) needs ALLOW_CLEARTEXT_HTTP=1 at build time; debug builds already allow it.
module.exports = ({ config }) => {
  const merchantId = process.env.APPLE_MERCHANT_ID || '';
  const cleartext = process.env.ALLOW_CLEARTEXT_HTTP === '1';
  return {
    ...config,
    extra: { ...(config.extra || {}), stripeMerchantId: merchantId },
    plugins: (config.plugins || []).map((p) => {
      if (Array.isArray(p) && p[0] === '@stripe/stripe-react-native' && merchantId) return [p[0], { ...p[1], merchantIdentifier: merchantId }];
      if (p === 'expo-build-properties' && cleartext) return [p, { android: { usesCleartextTraffic: true } }];
      return p;
    }),
  };
};
