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
    // Get client IP from headers (try multiple headers for reliability)
    const clientIP = req.headers.get("cf-connecting-ip") ||
                     req.headers.get("x-real-ip") ||
                     req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     "unknown";

    // Mask IP for logging - only show first 3 octets for privacy
    const maskedIP = clientIP !== "unknown" 
      ? clientIP.split('.').slice(0, 3).join('.') + '.XXX'
      : "unknown";
    console.log("Detecting country for IP:", maskedIP);

    // Primary: Use ip-api.com for free geolocation
    let geoData = null;
    
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode`);
      if (geoResponse.ok) {
        geoData = await geoResponse.json();
        console.log("Geo lookup status:", geoData.status);
      }
    } catch (e) {
      console.log("Primary geo service failed, trying fallback");
    }

    // If primary fails, try ipinfo.io as fallback
    if (!geoData || geoData.status !== "success") {
      try {
        const fallbackResponse = await fetch(`https://ipinfo.io/${clientIP}/json`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("Fallback geo lookup completed");
          if (fallbackData.country) {
            geoData = {
              status: "success",
              country: fallbackData.country,
              countryCode: fallbackData.country
            };
            // ipinfo returns country code, we need to map common ones
            const countryNames: Record<string, string> = {
              IN: "India", US: "United States", GB: "United Kingdom",
              CA: "Canada", AU: "Australia", DE: "Germany", FR: "France",
              BR: "Brazil", RU: "Russia", AE: "United Arab Emirates",
              SA: "Saudi Arabia", PK: "Pakistan", BD: "Bangladesh",
              ID: "Indonesia", PH: "Philippines", TH: "Thailand",
              VN: "Vietnam", MY: "Malaysia", TR: "Turkey", EG: "Egypt",
              NG: "Nigeria", ZA: "South Africa", MX: "Mexico", CO: "Colombia",
              KW: "Kuwait", QA: "Qatar", BH: "Bahrain", OM: "Oman"
            };
            geoData.country = countryNames[fallbackData.country] || fallbackData.country;
            geoData.countryCode = fallbackData.country;
          }
        }
      } catch (e) {
        console.log("Fallback geo service also failed");
      }
    }

    if (geoData && geoData.status === "success") {
      console.log("Country detected:", geoData.countryCode);
      return new Response(
        JSON.stringify({
          country: geoData.country,
          countryCode: geoData.countryCode,
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Fallback if all IP lookups fail
    console.log("All geo services failed, returning Unknown");
    return new Response(
      JSON.stringify({
        country: "Unknown",
        countryCode: "XX",
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in country detection");
    return new Response(
      JSON.stringify({
        country: "Unknown", 
        countryCode: "XX",
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  }
});
