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
  MapPin,
  TrendingUp,
  Droplets,
  Wind,
  Sun,
  Activity,
  ChevronRight
} from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import Chart from "react-apexcharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/portal/agriculture")({
  component: Agriculture,
});

const API_BASE = "http://localhost:8000";

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

const marketData = [
  { crop: "Wheat", price: "₹2,125/q", trend: "+1.2%", status: "High Demand" },
  { crop: "Rice (Paddy)", price: "₹2,040/q", trend: "-0.5%", status: "Stable" },
  { crop: "Maize", price: "₹1,962/q", trend: "+2.4%", status: "High Demand" },
  { crop: "Cotton", price: "₹6,080/q", trend: "+0.8%", status: "Stable" },
];

function Agriculture() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const resp = await fetch(`${API_BASE}/live/weather?city=Hyderabad`);
        if (!resp.ok) throw new Error("Weather fetch failed");
        const data: WeatherResponse = await resp.json();
        setWeather(data);
      } catch (err) {
        setWeatherLoading(false);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, []);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setDiagnosis(null);
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
      if (imageFile) formData.append("image", imageFile);
      else {
        const dummyBlob = new Blob(["dummy"], { type: "image/jpeg" });
        formData.append("image", new File([dummyBlob], "desc.jpg", { type: "image/jpeg" }));
      }
      formData.append("description", description || "Analyze this crop for diseases");
      formData.append("language", "en");

      const resp = await fetch(`${API_BASE}/ai/agriculture/analyze`, { method: "POST", body: formData });
      if (!resp.ok) throw new Error("Analysis failed");
      const data = await resp.json();
      setDiagnosis(data);
    } catch {
      setDiagnosis({
        diagnosis: "Bacterial Leaf Blight",
        confidence: 87,
        treatment: [
          "Apply copper-based bactericide (Blitox 50) every 7 days",
          "Remove and destroy infected leaves",
          "Switch to drip or furrow irrigation",
        ],
        schemes: ["PM Fasal Bima Yojana", "Rashtriya Krishi Vikas Yojana"],
        is_mock: true,
      });
      toast.warning("Using offline diagnosis (AI service unavailable).");
    } finally {
      setAnalyzing(false);
    }
  };

  const soilMoistureOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0 } },
    colors: ["#16A34A"],
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <PageHeader 
        title="Agri-Operations Center" 
        description="Comprehensive farm telemetry, weather patterns, and crop disease diagnostics."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs border-primary text-primary"><Leaf className="mr-2 h-3.5 w-3.5" /> Generate Advisory</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Telemetry Strip */}
        <Card className="col-span-1 lg:col-span-4 shadow-none border-border">
          <CardContent className="p-0 flex flex-wrap divide-y lg:divide-y-0 lg:divide-x divide-border/50">
            <div className="flex-1 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Soil Moisture</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">42%</h3>
                  <span className="text-[10px] text-success">Optimal</span>
                </div>
              </div>
              <Droplets className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
            <div className="flex-1 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Avg Temperature</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">28°C</h3>
                  <span className="text-[10px] text-orange-500">+2°C vs norm</span>
                </div>
              </div>
              <Sun className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
            <div className="flex-1 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Wind Speed</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">12 km/h</h3>
                  <span className="text-[10px] text-muted-foreground">SE</span>
                </div>
              </div>
              <Wind className="h-8 w-8 text-slate-500 opacity-20" />
            </div>
            <div className="flex-1 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Crop Health Index</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-success">8.4<span className="text-sm">/10</span></h3>
                </div>
              </div>
              <Activity className="h-8 w-8 text-success opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        
        {/* Left Column: Alerts & Maps */}
        <div className="space-y-4 flex flex-col">
          <Card className="shadow-none border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Bug className="h-4 w-4" /> Pest & Disease Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="rounded-sm bg-destructive/10 border border-destructive/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-[9px] h-4 px-1 rounded-sm">CRITICAL</Badge>
                  <span className="text-xs font-semibold text-destructive">Fall Armyworm Detected</span>
                </div>
                <p className="text-[10px] text-destructive/80 leading-relaxed">Widespread activity noted in adjoining districts. Pre-emptive spraying of Spinosad recommended immediately.</p>
              </div>
              <div className="rounded-sm bg-warning/10 border border-warning/20 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-sm text-warning-foreground border-warning">WARNING</Badge>
                  <span className="text-xs font-semibold text-warning-foreground">Aphid Population Rising</span>
                </div>
                <p className="text-[10px] text-warning-foreground/80 leading-relaxed">Monitor cotton crops closely. If population exceeds 10 per leaf, apply Imidacloprid.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border flex-1">
            <CardHeader className="p-4 pb-2 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Nearby Market Prices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px] h-7">Commodity</TableHead>
                    <TableHead className="text-[10px] h-7">Price (₹/q)</TableHead>
                    <TableHead className="text-[10px] h-7 text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketData.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-2 font-medium">{m.crop}</TableCell>
                      <TableCell className="text-xs py-2 font-mono">{m.price}</TableCell>
                      <TableCell className="text-xs py-2 text-right">
                        <span className={m.trend.startsWith('+') ? "text-success" : "text-destructive"}>{m.trend}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Center/Right: Diagnostic Tool */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          <Card className="shadow-none border-border flex-1 flex flex-col">
            <CardHeader className="p-4 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Camera className="h-4 w-4" /> AI Crop Diagnostic Tool</CardTitle>
              <CardDescription className="text-xs">Upload multispectral or standard imagery for deep learning analysis.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                {/* Upload Section */}
                <div className="flex flex-col gap-3">
                  <div
                    className="flex-1 min-h-[160px] relative flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-border p-4 transition-colors hover:bg-muted/30 cursor-pointer bg-muted/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageUrl ? (
                      <>
                        <img src={imageUrl} alt="Crop" className="absolute inset-0 h-full w-full object-cover rounded-sm opacity-80" />
                        <button
                          className="absolute top-2 right-2 rounded-sm bg-background/80 backdrop-blur border border-border p-1 hover:bg-destructive hover:text-white"
                          onClick={(e) => { e.stopPropagation(); setImageFile(null); setImageUrl(null); setDiagnosis(null); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground/50" />
                        <p className="text-xs font-semibold text-muted-foreground">Upload Sample Imagery</p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </div>
                  <Input
                    placeholder="Enter manual telemetry or observation notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-8 text-xs rounded-sm"
                  />
                  <Button onClick={handleAnalyze} disabled={analyzing} className="h-8 text-xs w-full rounded-sm">
                    {analyzing ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Processing Vector Data…</> : "Run Diagnostics"}
                  </Button>
                </div>

                {/* Results Section */}
                <div className="flex-1 border border-border rounded-sm bg-muted/10 overflow-y-auto">
                  {diagnosis ? (
                    <div className="p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="pb-3 border-b border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Identified Pathology</span>
                          <Badge variant="outline" className={`text-[9px] h-4 rounded-sm ${diagnosis.confidence > 80 ? 'text-success border-success/30 bg-success/10' : 'text-warning border-warning/30 bg-warning/10'}`}>
                            {diagnosis.confidence}% Confidence
                          </Badge>
                        </div>
                        <h3 className="text-sm font-bold text-foreground">{diagnosis.diagnosis}</h3>
                      </div>
                      
                      <div>
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Recommended Treatment Protocol</h4>
                        <ul className="space-y-1.5">
                          {diagnosis.treatment.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                              <span className="text-primary font-bold">{i+1}.</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {diagnosis.schemes.length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Eligible Subsidies / Schemes</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {diagnosis.schemes.map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-[9px] font-medium rounded-sm border-border">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2 opacity-50">
                      <Activity className="h-8 w-8" />
                      <p className="text-xs font-semibold">Awaiting Input Data</p>
                      <p className="text-[10px]">Upload a multispectral image or provide observation notes to run diagnostics.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Weather Strip */}
          <Card className="shadow-none border-border shrink-0">
             <CardContent className="p-0 flex flex-nowrap overflow-x-auto divide-x divide-border/50">
                {weatherLoading ? (
                  <div className="p-4 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Syncing meteorological data...</div>
                ) : (
                  (weather?.forecast ?? []).map((w, i) => (
                    <div key={i} className="min-w-[100px] flex-1 p-3 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{w.day}</span>
                      <span className="text-xl my-1">{w.icon}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{w.high}°</span>
                        <span className="text-[10px] text-muted-foreground">{w.low}°</span>
                      </div>
                    </div>
                  ))
                )}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
