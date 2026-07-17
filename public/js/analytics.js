/*
  Drop your real IDs in below, then include this file once near the top of
  <head> on the pages you want tracked (storefront, product page, cart,
  checkout). Leave an ID blank to skip that provider entirely -- nothing
  will load or error if you haven't signed up for it yet.

  Where to get these:
    GA4:  analytics.google.com -> Admin -> Data Streams -> your web stream
          -> "Measurement ID" (looks like G-XXXXXXXXXX)
    Meta: business.facebook.com/events_manager -> your Pixel -> Settings
          -> "Pixel ID" (a plain number)
*/

const GA_MEASUREMENT_ID = ""; // e.g. "G-XXXXXXXXXX"
const META_PIXEL_ID = ""; // e.g. "1234567890123456"

/* ---------------- Google Analytics (GA4) ---------------- */
if (GA_MEASUREMENT_ID) {
  const gaScript = document.createElement("script");
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gaScript);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
}

/* ---------------- Meta (Facebook/Instagram) Pixel ---------------- */
if (META_PIXEL_ID) {
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

/*
  ── Suggested events to add once IDs are filled in ──
  These aren't wired up automatically since they live in other files
  (cart.js, checkout.js, decision-page.js). Small additions, high value:

    Add to cart   (cart.js, after a successful add):
      gtag?.("event", "add_to_cart", { value: item.price, currency: "NGN" });
      fbq?.("track", "AddToCart");

    Begin checkout (checkout.js, on page load):
      gtag?.("event", "begin_checkout");
      fbq?.("track", "InitiateCheckout");

    Purchase (checkout.js, right before opening WhatsApp):
      gtag?.("event", "purchase", { value: subtotalValueAmount, currency: "NGN" });
      fbq?.("track", "Purchase", { value: subtotalValueAmount, currency: "NGN" });

  Say the word and I'll wire these in directly.
*/