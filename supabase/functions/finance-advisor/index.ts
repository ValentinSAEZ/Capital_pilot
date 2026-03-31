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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return json({ error: "OPENAI_API_KEY is missing" }, 500);
    }

    const body = await req.json() as Payload;
    const prompt = buildPrompt(body);
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o";

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: [
              "Tu es Capital Pilot, un conseiller financier familial.",
              "Réponds uniquement en HTML concis et direct.",
              "Écris en français.",
              "Donne des conseils pratiques sur l'allocation, le budget et l'investissement.",
              "Utilise uniquement <p>, <strong> et <ul><li>.",
              "Ne mentionne pas que tu es une IA.",
              "Ne donne pas de garanties légales ou réglementées.",
              "Adapte toujours les conseils aux chiffres et objectifs fournis.",
            ].join(" "),
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const openaiData = await openaiRes.json();
    if (!openaiRes.ok) {
      return json({ error: openaiData?.error?.message || "OpenAI request failed" }, 500);
    }

    const advice = openaiData?.choices?.[0]?.message?.content || "";

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
