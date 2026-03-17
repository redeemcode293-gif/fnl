import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguage, sourceLanguage = "en" } = await req.json();
    
    // If target is same as source, return texts as-is
    if (targetLanguage === sourceLanguage) {
      const result: Record<string, string> = {};
      texts.forEach((text: string) => {
        result[text] = text;
      });
      return new Response(JSON.stringify({ translations: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const languageNames: Record<string, string> = {
      en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
      pt: "Portuguese", ru: "Russian", zh: "Chinese", ja: "Japanese", ko: "Korean",
      ar: "Arabic", hi: "Hindi", bn: "Bengali", ur: "Urdu", tr: "Turkish",
      vi: "Vietnamese", th: "Thai", id: "Indonesian", ms: "Malay", tl: "Filipino",
      nl: "Dutch", pl: "Polish", uk: "Ukrainian", sv: "Swedish", el: "Greek", he: "Hebrew"
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    const prompt = `Translate the following texts from English to ${targetLangName}. 
Return ONLY a JSON object where keys are the original English texts and values are the translated texts.
Do not add any explanation or markdown formatting.

Texts to translate:
${JSON.stringify(texts)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { 
            role: "system", 
            content: "You are a professional translator. Return only valid JSON with translations, no markdown or explanations." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Translation service unavailable");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Parse the JSON response, handling potential markdown code blocks
    let translations: Record<string, string>;
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      translations = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse translation response:", content);
      // Fallback: return original texts
      translations = {};
      texts.forEach((text: string) => {
        translations[text] = text;
      });
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
