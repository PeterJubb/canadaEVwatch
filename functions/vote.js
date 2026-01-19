// Netlify Function: POST /.netlify/functions/vote
// Body: { carId, vote, fingerprint }

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { carId, vote, fingerprint } = await req.json();

    if (!carId || !fingerprint || !["yes", "no"].includes(vote)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert vote (DB unique index prevents duplicate per fingerprint per car)
    const res = await fetch(`${url}/rest/v1/votes`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ car_id: carId, vote, fingerprint }),
    });

    // If duplicate, treat as OK (means they already voted for that car)
    if (!res.ok) {
      const txt = await res.text();
      if (txt.includes("duplicate key value") || txt.includes("votes_unique_fingerprint_car")) {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: txt }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
