export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, userNickname, userAvatar, userColor, userAvatarImage, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: "Missing required fields" });

  const key = (process.env.STRIPE_SECRET_KEY || "").replace(/^﻿/, "").replace(/[^\x20-\x7E]/g, "").trim();
  if (!key) return res.status(500).json({ error: "Stripe key not configured" });

  try {
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("line_items[0][price_data][currency]", "hkd");
    params.append("line_items[0][price_data][product_data][name]", `打賞 ${userNickname || "用戶"}`);
    params.append("line_items[0][price_data][unit_amount]", String(amount * 100));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[userId]", userId);
    params.append("metadata[userNickname]", userNickname || "");
    params.append("metadata[userAvatar]", userAvatar || "");
    params.append("metadata[userColor]", userColor || "");
    params.append("metadata[userAvatarImage]", userAvatarImage || "");
    params.append("metadata[amount]", String(amount));
    params.append("success_url", "https://www.evonchat.com/?donation=success");
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
