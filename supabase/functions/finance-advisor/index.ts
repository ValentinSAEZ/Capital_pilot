const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  profile?: Record<string, unknown>;
  accounts?: Array<Record<string, unknown>>;
  goals?: Array<Record<string, unknown>>;
  snapshot?: Record<string, unknown>;
  plan?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return json({ error: "ANTHROPIC_API_KEY is missing" }, 500);
    }

    const body = await req.json() as Payload;
    const prompt = buildPrompt(body);
    const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system: [
          "You are Capital Pilot, a French family finance copilot.",
          "Return concise, direct HTML only.",
          "Write in French.",
          "Give practical allocation, budgeting and investing guidance.",
          "Use sections with <p>, <strong>, and <ul><li> only.",
          "Do not mention being an AI model.",
          "Do not give legal or regulated guarantees.",
          "Always adapt advice to the numbers provided and the user's goals.",
        ].join(" "),
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    const anthropicData = await anthropicRes.json();
    if (!anthropicRes.ok) {
      return json({ error: anthropicData?.error?.message || "Anthropic request failed" }, 500);
    }

    const advice = Array.isArray(anthropicData?.content)
      ? anthropicData.content
          .filter((item: { type?: string }) => item?.type === "text")
          .map((item: { text?: string }) => item.text || "")
          .join("\n")
      : "";

    return json({ advice });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function buildPrompt(payload: Payload) {
  return [
    "Analyse cette situation financière familiale en temps réel.",
    "Je veux une réponse HTML concise mais intelligente, orientée action.",
    "Structure attendue:",
    "1. Un paragraphe de lecture de la situation.",
    "2. Une liste de 3 à 5 actions d'investissement ou d'allocation concrètes.",
    "3. Une liste de 2 à 4 points de vigilance.",
    "4. Une phrase finale avec la priorité du mois.",
    "Contraintes:",
    "- Utiliser les montants et objectifs fournis.",
    "- Dire clairement si le projet n'est pas finançable au rythme actuel.",
    "- Suggérer des classes d'actifs ou enveloppes simples si pertinent: livret, fonds euros, ETF monde, obligataire court terme, etc.",
    "- Éviter les banalités.",
    "",
    JSON.stringify(payload),
  ].join("\n");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });
}
