import Stripe from "stripe";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").replace(/[^\x20-\x7E]/g, "").trim();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, userNickname, userAvatar, userColor, userAvatarImage, amount } = session.metadata;
    try {
      await addDoc(collection(db, "donations"), {
        userId,
        userNickname: userNickname || "",
        userAvatar: userAvatar || "",
        userColor: userColor || "",
        userAvatarImage: userAvatarImage || "",
        amount: parseInt(amount, 10) || 0,
        sessionId: session.id,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Firestore write error:", err);
    }
  }

  return res.status(200).json({ received: true });
}
