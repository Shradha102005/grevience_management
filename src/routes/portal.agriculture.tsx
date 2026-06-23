import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Leaf,
  Upload,
  Cloud,
  FlaskConical,
  Bug,
  Camera,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { ChatPanel } from "@/components/portal/chat-panel";
import { VoiceOrb, type VoiceOrbState } from "@/components/portal/voice-orb";
import { LanguageSelector } from "@/components/portal/language-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/agriculture")({
  head: () => ({ meta: [{ title: "Agriculture Advisory — CIVICOS AI" }] }),
  component: Agriculture,
});

const API_BASE = "http://localhost:8000";

const SPEECH_LANG: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN",
  kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN",
};

interface WeatherDay {
  day: string;
  icon: string;
  high: number;
  low: number;
  humidity: number;
  wind_speed: number;
  rain_chance: number;
  description: string;
}

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  treatment: string[];
  schemes: string[];
  is_mock: boolean;
}

interface WeatherResponse {
  city: string;
  forecast: WeatherDay[];
  advisory: string[];
  source: string;
}

function Agriculture() {
  const [language, setLanguage] = useState("en");
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  // Fetch live weather on mount
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const city = "Hyderabad"; // Could be user-configurable
        const resp = await fetch(`${API_BASE}/live/weather?city=${encodeURIComponent(city)}`);
        if (!resp.ok) throw new Error("Weather fetch failed");
        const data: WeatherResponse = await resp.json();
        setWeather(data);
      } catch (err) {
        console.error("Weather API error:", err);
        toast.error("Could not load weather data");
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setDiagnosis(null);
    toast.success("Image loaded — describe symptoms and click Analyze.");
  };

  const handleAnalyze = async () => {
    if (!imageFile && !description.trim()) {
      toast.error("Please upload an image or describe the crop symptoms.");
      return;
    }

    setAnalyzing(true);
    setDiagnosis(null);

    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append("image", imageFile);
      } else {
        // Create a 1x1 dummy file if no image provided
        const dummyBlob = new Blob(["dummy"], { type: "image/jpeg" });
        formData.append("image", new File([dummyBlob], "desc.jpg", { type: "image/jpeg" }));
      }
      formData.append("description", description || "Analyze this crop for diseases or deficiencies");
      formData.append("language", language);

      const resp = await fetch(`${API_BASE}/ai/agriculture/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Analysis failed");
      const data: Diagnosis = await resp.json();
      setDiagnosis(data);
      toast.success("Analysis complete!");
    } catch {
      // Fallback mock
      setDiagnosis({
        diagnosis: "Bacterial Leaf Blight",
        confidence: 87,
        treatment: [
          "Apply copper-based bactericide (Blitox 50) every 7 days for 3 weeks",
          "Remove and destroy all infected leaves immediately",
          "Avoid overhead irrigation — switch to drip or furrow irrigation",
          "Apply nitrogen cautiously — excess nitrogen worsens bacterial blight",
          "Maintain proper spacing for air circulation",
        ],
        schemes: [
          "PM Fasal Bima Yojana — file crop loss claim immediately",
          "Rashtriya Krishi Vikas Yojana — apply for pest management support",
          "Kisan Call Centre — dial 1800-180-1551 for free expert advice",
        ],
        is_mock: true,
      });
      toast.warning("Using offline diagnosis (AI service unavailable).");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVoiceOrb = useCallback(() => {
    if (orbState === "listening") {
      recognitionRef.current?.stop();
      setOrbState("idle");
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      toast.error("Voice requires Chrome or Edge browser.");
      return;
    }

    const recognition = new SR();
    recognition.lang = SPEECH_LANG[language] ?? "en-IN";
    recognition.onstart = () => setOrbState("listening");
    recognition.onerror = () => setOrbState("idle");
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setDescription((prev) => (prev ? `${prev}. ${t}` : t));
      setOrbState("idle");
      toast.success(`Added voice description: "${t}"`);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [orbState, language]);

  return (
    <div>
      <PageHeader
        icon={Leaf}
        title="Agriculture Advisory Assistant"
        description="Crop, weather, and soil advisory with AI photo analysis for pest and disease detection."
      />

      {/* Language + Weather strip */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</span>
          <LanguageSelector value={language} onChange={setLanguage} />
          {weather && (
            <span className="text-xs text-muted-foreground">
              📍 {weather.city}
              {weather.source === "openweathermap" ? " · Live" : " · Seasonal estimate"}
            </span>
          )}
        </div>
        {/* 7-day weather — live from OpenWeatherMap */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weatherLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching weather…
            </div>
          ) : (
            (weather?.forecast ?? []).map((w) => (
              <div key={w.day} className="flex flex-col items-center rounded-lg border border-border bg-card px-3 py-2 text-center shrink-0" title={`${w.description} · Humidity ${w.humidity}% · Rain ${w.rain_chance}%`}>
                <span className="text-xs font-semibold text-muted-foreground">{w.day}</span>
                <span className="text-lg mt-0.5">{w.icon}</span>
                <span className="text-xs font-bold">{w.high}°</span>
                <span className="text-[10px] text-muted-foreground">{w.low}°</span>
                {w.rain_chance > 40 && (
                  <span className="text-[10px] text-blue-500 font-medium">{w.rain_chance}%🌧️</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Advisory highlights — live from API */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card hover:shadow-elevated transition-shadow">
          <CardContent className="pt-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 mb-3">
              <Cloud className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Weather Advisory</h3>
            {weatherLoading ? (
              <p className="mt-1 text-xs text-muted-foreground">Loading…</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {weather?.advisory?.[0] ?? "No advisory data"}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elevated transition-shadow">
          <CardContent className="pt-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 mb-3">
              <FlaskConical className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Soil & Fertilizer</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {weather?.advisory?.[1] ?? "Apply basal NPK before sowing. Phosphorus deficiency likely in red soil zones."}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elevated transition-shadow">
          <CardContent className="pt-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 mb-3">
              <Bug className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Pest Alert</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {weather?.advisory?.[2] ?? "Fall Armyworm active in kharif crops. Use pheromone traps and spray Spinosad."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: Photo analysis + Voice */}
        <div className="space-y-5">
          {/* Crop Photo Analysis */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Crop Photo Analysis
              </CardTitle>
              <p className="text-xs text-muted-foreground">Upload a photo of your crop for AI disease/pest diagnosis</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload zone */}
              <div
                className="relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/30 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Crop" className="h-36 w-auto rounded-lg object-cover" />
                    <button
                      className="absolute top-2 right-2 rounded-full bg-destructive/90 p-1 text-white hover:bg-destructive"
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImageUrl(null); setDiagnosis(null); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="text-xs text-primary font-medium">{imageFile?.name}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/60" />
                    <p>Click to upload crop photo</p>
                    <p className="text-xs text-muted-foreground/60">JPG, PNG up to 10MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Voice describe */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Describe symptoms (or use voice)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. yellow spots on leaves, wilting, brown edges…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant={orbState === "listening" ? "destructive" : "outline"}
                    className={`h-9 w-9 shrink-0 ${orbState === "listening" ? "animate-pulse" : ""}`}
                    onClick={handleVoiceOrb}
                    title="Describe symptoms by voice"
                  >
                    <VoiceOrb state={orbState === "idle" ? "idle" : orbState} size="sm" className="scale-[0.35]" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
                {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : "Analyze Crop"}
              </Button>

              {/* Diagnosis result */}
              {diagnosis && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                      <h3 className="font-semibold text-sm">{diagnosis.diagnosis}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-warning/20 text-warning-foreground" variant="secondary">
                        {diagnosis.confidence}% confident
                      </Badge>
                      {diagnosis.is_mock && <Badge variant="outline" className="text-[10px]">Offline</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Treatment Plan:</p>
                    <ul className="space-y-1">
                      {diagnosis.treatment.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {diagnosis.schemes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Relevant Schemes & Support:</p>
                      <ul className="space-y-1">
                        {diagnosis.schemes.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Leaf className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Chat */}
        <ChatPanel
          title="Agriculture Assistant"
          greeting="Ask me about crops, weather, soil, fertilizers, pest control, or government farming schemes. I can also help diagnose crop diseases from your description."
          suggestions={["Best crop for kharif season", "Fertilizer for wheat", "How to treat leaf blight", "PM Fasal Bima how to claim"]}
          module="agriculture"
          showLanguageSelector={false}
        />
      </div>
    </div>
  );
}
