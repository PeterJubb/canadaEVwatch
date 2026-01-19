// Netlify Function: GET /.netlify/functions/counts
// Returns: { counts: { [carId]: { yes, no } } }

export default async (req) => {
  try {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // For small scale this is fine. (If it grows big, we’ll switch to an aggregate view/RPC.)
    const res = await fetch(`${url}/rest/v1/votes?select=car_id,vote`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: txt }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rows = await res.json();
    const counts = {};

    for (const r of rows) {
      const id = r.car_id;
      if (!counts[id]) counts[id] = { yes: 0, no: 0 };
      if (r.vote === "yes") counts[id].yes++;
      if (r.vote === "no") counts[id].no++;
    }

    return new Response(JSON.stringify({ counts }), {
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
