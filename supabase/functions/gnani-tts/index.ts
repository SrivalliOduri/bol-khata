// Gnani AI Timbre TTS Edge Function
// Proxies text-to-speech requests to Gnani's REST TTS endpoint.
// Endpoint: POST https://api.vachana.ai/api/v1/tts/inference
// Auth: X-API-Key-ID header (read from GNANI_API_KEY secret)
// Returns base64-encoded WAV audio for frontend playback.
// No mock fallback — returns a clear error if the key is not configured.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GNANI_TTS_URL = "https://api.vachana.ai/api/v1/tts/inference";

const LANGUAGE_MAP: Record<string, string> = {
  hindi: "hi-IN",
  english: "en-IN",
  telugu: "te-IN",
};

const VOICE_MAP: Record<string, string> = {
  default: "Nalini",
  male: "Deepak",
  female: "Nalini",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GNANI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Gnani AI is not configured. Set GNANI_API_KEY in Supabase Edge Function secrets.",
          mode: "not_configured",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const text = body.text as string;
    const languageKey = (body.language as string) || "hindi";
    const voicePref = (body.voice as string) || "default";

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required for speech synthesis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const languageCode = LANGUAGE_MAP[languageKey] ?? "hi-IN";
    const voice = VOICE_MAP[voicePref] ?? "Nalini";

    const ttsBody = {
      text,
      voice,
      model: "timbre-v2.5",
      language: languageCode,
      speed: 1.0,
      audio_config: {
        sample_rate: 16000,
        num_channels: 1,
        sample_width: 2,
        encoding: "linear_pcm",
        container: "wav",
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const gnaniRes = await fetch(GNANI_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key-ID": apiKey,
      },
      body: JSON.stringify(ttsBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!gnaniRes.ok) {
      const errText = await gnaniRes.text().catch(() => "");
      let errMsg = `Gnani TTS failed (${gnaniRes.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.message) errMsg = errJson.message;
        else if (errJson?.detail?.message) errMsg = errJson.detail.message;
        else if (errJson?.error?.message) errMsg = errJson.error.message;
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: gnaniRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Gnani TTS returns raw binary audio
    const audioBuffer = await gnaniRes.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    return new Response(
      JSON.stringify({ audioBase64: base64, mode: "real" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error in TTS proxy.";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
