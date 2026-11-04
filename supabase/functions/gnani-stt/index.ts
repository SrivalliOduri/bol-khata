// Gnani AI Prisma STT Edge Function
// Proxies browser-recorded audio to Gnani's REST STT endpoint.
// Endpoint: POST https://api.vachana.ai/stt/v3
// Auth: X-API-Key-ID header (read from GNANI_API_KEY secret)
// No mock fallback — returns a clear error if the key is not configured.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GNANI_STT_URL = "https://api.vachana.ai/stt/v3";

const LANGUAGE_MAP: Record<string, string> = {
  hindi: "hi-IN",
  english: "en-IN",
  telugu: "te-IN",
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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const languageKey = (formData.get("language") as string) || "hindi";

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const languageCode = LANGUAGE_MAP[languageKey] ?? "hi-IN";

    // Build multipart form for Gnani Prisma STT
    // Use the filename from the uploaded file (frontend sends recording.wav)
    const uploadFilename = audioFile.name || "recording.wav";
    const gnaniForm = new FormData();
    gnaniForm.append("audio_file", audioFile, uploadFilename);
    gnaniForm.append("model", "prisma-v3.0");
    gnaniForm.append("language_code", languageCode);
    gnaniForm.append("format", "transcribe");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const gnaniRes = await fetch(GNANI_STT_URL, {
      method: "POST",
      headers: { "X-API-Key-ID": apiKey },
      body: gnaniForm,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!gnaniRes.ok) {
      const errText = await gnaniRes.text().catch(() => "");
      let errMsg = `Gnani STT failed (${gnaniRes.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) errMsg = errJson.error.message;
        else if (errJson?.detail?.message) errMsg = errJson.detail.message;
        else if (errJson?.message) errMsg = errJson.message;
      } catch { /* use default */ }
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: gnaniRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const gnaniData = await gnaniRes.json();

    // Gnani returns transcript at the top level; some variants nest under "result"
    const transcript =
      gnaniData.transcript ??
      gnaniData.result?.transcript ??
      gnaniData.text ??
      "";

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: "Gnani STT returned an empty transcript.", mode: "real" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const detectedLang = gnaniData.detected_language_code ?? languageCode;

    return new Response(
      JSON.stringify({
        transcript,
        language: languageKey,
        detectedLanguage: detectedLang,
        mode: "real",
        requestId: gnaniData.request_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error in STT proxy.";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
