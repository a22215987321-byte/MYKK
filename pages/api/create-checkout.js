// Fixed server-side prices for real "buy" products — never trust a
// client-supplied amount for these the way the free-form donation flow
// below does (a tip's amount is the donor's choice; a paid unlock's price
// is not).
// TEMP: 0.1 for a real end-to-end test with a live-mode charge — change
// back to 168 before real users start unlocking this.
const PRODUCT_PRICES = {
  ai_companion_unlock: 0.1,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, userNickname, userAvatar, userColor, userAvatarImage, amount, product } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing required fields" });

  const isProductPurchase = Object.prototype.hasOwnProperty.call(PRODUCT_PRICES, product);
  if (!isProductPurchase && !amount) return res.status(400).json({ error: "Missing required fields" });

  const finalAmount = isProductPurchase ? PRODUCT_PRICES[product] : amount;
  const productName = product === "ai_companion_unlock" ? "解鎖 AI 夥伴" : `打賞 ${userNickname || "用戶"}`;

  const key = (process.env.STRIPE_SECRET_KEY || "").replace(/^﻿/, "").replace(/[^\x20-\x7E]/g, "").trim();
  if (!key) return res.status(500).json({ error: "Stripe key not configured" });

  try {
    // Stripe hard-caps every metadata value at 500 characters. AvatarCreator.js
    // saves avatarImage as a full base64 data URL (thousands of chars), which
    // blew this up for any user with a custom avatar — drop it instead of
    // sending a value Stripe will always reject; a real hosted URL still
    // passes through untouched.
    const safeMeta = (s) => {
      const v = s || "";
      return v.length > 500 ? "" : v;
    };

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("line_items[0][price_data][currency]", "hkd");
    params.append("line_items[0][price_data][product_data][name]", productName);
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(finalAmount * 100)));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[userId]", userId);
    params.append("metadata[userNickname]", safeMeta(userNickname));
    params.append("metadata[userAvatar]", safeMeta(userAvatar));
    params.append("metadata[userColor]", safeMeta(userColor));
    params.append("metadata[userAvatarImage]", safeMeta(userAvatarImage));
    params.append("metadata[amount]", String(finalAmount));
    if (isProductPurchase) params.append("metadata[product]", product);
    params.append("success_url", isProductPurchase ? "https://www.evonchat.com/?unlock=ai_companion" : "https://www.evonchat.com/?donation=success");
    params.append("cancel_url", "https://www.evonchat.com/");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();
    if (!response.ok) {
      console.error("Stripe API error:", session.error);
      return res.status(500).json({ error: session.error?.message || "Stripe error" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
