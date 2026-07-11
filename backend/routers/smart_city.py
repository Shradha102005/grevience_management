"""
Smart City Router — CIVICOS AI
Nation-wide city information hub.
City is passed as a query param (e.g. ?city=Hyderabad) for all read endpoints.
"""
from __future__ import annotations

import os
import uuid
import random
import logging
import datetime as dt_module
from datetime import datetime, timezone
from typing import Optional, List, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User, CityEvent, NearbyService, ParkingLocation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-city", tags=["Smart City"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "")

# ── Popular Indian cities for the city selector ───────────────────────────────

POPULAR_CITIES = [
    "Hyderabad", "Mumbai", "Delhi", "Chennai", "Bengaluru",
    "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
    "Surat", "Kanpur", "Nagpur", "Indore", "Bhopal",
    "Patna", "Vadodara", "Coimbatore", "Kochi", "Visakhapatnam",
    "Agra", "Nashik", "Mysuru", "Ranchi", "Chandigarh",
    "Thiruvananthapuram", "Amritsar", "Bhubaneswar", "Guwahati", "Dehradun",
]

@router.get("/cities")
async def get_popular_cities() -> dict:
    """Return list of popular Indian cities for the city selector."""
    return {"cities": POPULAR_CITIES}


# ── Weather + AQI ─────────────────────────────────────────────────────────────

def _weather_icon(condition: str) -> str:
    m = {
        "Clear": "☀️", "Clouds": "⛅", "Rain": "🌧️", "Drizzle": "🌦️",
        "Thunderstorm": "⛈️", "Snow": "❄️", "Mist": "🌫️", "Haze": "🌫️",
        "Fog": "🌁", "Smoke": "🌫️", "Dust": "🌪️",
    }
    return m.get(condition, "🌡️")

def _fallback_weather(city: str) -> dict:
    """Seasonal estimate for Indian cities when API key is absent."""
    month = datetime.now().month
    if month in (12, 1, 2):
        hi, lo, hum, cond = 28, 16, 45, "Clear"
    elif month in (3, 4, 5):
        hi, lo, hum, cond = 40, 26, 35, "Haze"
    elif month in (6, 7, 8, 9):
        hi, lo, hum, cond = 31, 24, 80, "Rain"
    else:
        hi, lo, hum, cond = 32, 20, 55, "Clouds"
    days = []
    import calendar
    for i in range(5):
        d = datetime.now() + dt_module.timedelta(days=i)
        days.append({
            "date": d.strftime("%Y-%m-%d"),
            "day": calendar.day_abbr[d.weekday()],
            "weather": cond,
            "description": cond,
            "high": hi + random.randint(-2, 3),
            "low": lo + random.randint(-2, 2),
            "humidity": hum + random.randint(-5, 5),
            "wind_speed": round(random.uniform(8, 22), 1),
            "rain_chance": random.randint(0, 30) if cond not in ("Rain",) else random.randint(50, 90),
            "icon": _weather_icon(cond),
        })
    return {
        "city": city, "country": "IN",
        "current": {
            "temp": hi - 3, "feels_like": hi - 2,
            "humidity": hum, "wind_speed": 14.0,
            "weather": cond, "description": cond,
            "icon": _weather_icon(cond),
        },
        "forecast": days,
        "aqi": {"aqi": random.randint(60, 180), "category": "Moderate", "pm25": round(random.uniform(20, 60), 1)},
        "advisory": f"Stay hydrated. UV index is high in {city} this afternoon.",
        "source": "seasonal_estimate",
    }

def _aqi_category(aqi: int) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 200: return "Moderate"
    if aqi <= 300: return "Poor"
    if aqi <= 400: return "Very Poor"
    return "Severe"

@router.get("/weather")
async def get_weather(city: str = Query(default="Hyderabad")) -> dict:
    """Live weather forecast + AQI for any Indian city."""
    if not OPENWEATHER_API_KEY:
        return _fallback_weather(city)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Forecast
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={"q": f"{city},IN", "appid": OPENWEATHER_API_KEY, "units": "metric", "cnt": 40},
            )
            if resp.status_code != 200:
                return _fallback_weather(city)

            data = resp.json()
            lat = data["city"]["coord"]["lat"]
            lng = data["city"]["coord"]["lon"]

            # Build forecast
            import calendar
            days: dict[str, dict] = {}
            for item in data["list"]:
                date = item["dt_txt"][:10]
                if date not in days:
                    days[date] = {
                        "temps": [], "weather": item["weather"][0]["main"],
                        "description": item["weather"][0]["description"],
                        "humidity": item["main"]["humidity"],
                        "wind_speed": round(item["wind"]["speed"] * 3.6, 1),
                        "rain_chance": int(item.get("pop", 0) * 100),
                    }
                days[date]["temps"].append(item["main"]["temp"])

            forecast = []
            for date_str, info in list(days.items())[:5]:
                d = dt_module.date.fromisoformat(date_str)
                forecast.append({
                    "date": date_str, "day": calendar.day_abbr[d.weekday()],
                    "weather": info["weather"], "description": info["description"].title(),
                    "high": round(max(info["temps"])), "low": round(min(info["temps"])),
                    "humidity": info["humidity"], "wind_speed": info["wind_speed"],
                    "rain_chance": info["rain_chance"], "icon": _weather_icon(info["weather"]),
                })

            current_item = data["list"][0]
            current = {
                "temp": round(current_item["main"]["temp"]),
                "feels_like": round(current_item["main"]["feels_like"]),
                "humidity": current_item["main"]["humidity"],
                "wind_speed": round(current_item["wind"]["speed"] * 3.6, 1),
                "weather": current_item["weather"][0]["main"],
                "description": current_item["weather"][0]["description"].title(),
                "icon": _weather_icon(current_item["weather"][0]["main"]),
            }

            # AQI from OpenWeatherMap Air Pollution API
            aqi_data = {"aqi": 80, "category": "Satisfactory", "pm25": 25.0}
            try:
                aqi_resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/air_pollution",
                    params={"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY},
                )
                if aqi_resp.status_code == 200:
                    aqi_raw = aqi_resp.json()
                    aqi_idx = aqi_raw["list"][0]["main"]["aqi"]  # 1-5
                    pm25 = aqi_raw["list"][0]["components"].get("pm2_5", 0)
                    aqi_val = aqi_idx * 50  # rough mapping to 0-250 scale
                    aqi_data = {"aqi": aqi_val, "category": _aqi_category(aqi_val), "pm25": round(pm25, 1)}
            except Exception:
                pass

            # Generate advisory
            advisory_parts = []
            if int(current.get("temp", 0)) >= 38:
                advisory_parts.append("🔥 Heatwave alert — avoid outdoor activity between 12–4 PM.")
            if int(forecast[0].get("rain_chance", 0)) > 60:
                advisory_parts.append("🌧️ Heavy rain likely today — carry an umbrella.")
            if int(aqi_data.get("aqi", 0)) > 200:
                advisory_parts.append("😷 Air quality is poor — wear a mask outdoors.")
            advisory = " ".join(advisory_parts) or f"Conditions are pleasant in {city} today."

            return {
                "city": city, "country": "IN",
                "current": current, "forecast": forecast,
                "aqi": aqi_data, "advisory": advisory,
                "source": "openweathermap",
            }

    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return _fallback_weather(city)


# ── Traffic ───────────────────────────────────────────────────────────────────

# In-memory advisories per city
_TRAFFIC_ADVISORIES: dict[str, list] = {}

# Key road segment coordinates for TomTom per known city
# These are lat/lng points on major arterial roads in each city
_CITY_ROAD_POINTS: dict[str, list[tuple[float, float, str]]] = {
    "hyderabad": [
        (17.4065, 78.4772, "Begumpet–Punjagutta"),
        (17.3850, 78.4867, "Nampally–Abids"),
        (17.4399, 78.4983, "Secunderabad Central"),
        (17.3616, 78.4747, "Mehdipatnam Ring Road"),
        (17.4947, 78.3996, "Gachibowli Hi-Tech City"),
        (17.3708, 78.5505, "LB Nagar Corridor"),
    ],
    "mumbai": [
        (19.0760, 72.8777, "Bandra–Kurla Complex"),
        (18.9696, 72.8194, "Churchgate Area"),
        (19.1136, 72.8697, "Andheri West"),
        (19.0595, 72.8353, "Dadar Junction"),
        (19.1663, 72.9475, "Powai–Hiranandani"),
        (18.9912, 72.8317, "Lower Parel"),
    ],
    "delhi": [
        (28.6280, 77.2090, "Connaught Place"),
        (28.6450, 77.0560, "Dwarka Expressway"),
        (28.5504, 77.2588, "Nehru Place"),
        (28.7041, 77.1025, "Rohini Corridor"),
        (28.5672, 77.3211, "Noida Border"),
        (28.6139, 77.3590, "Mayur Vihar"),
    ],
    "bengaluru": [
        (12.9716, 77.5946, "MG Road"),
        (12.9352, 77.6245, "Koramangala"),
        (13.0298, 77.5566, "Hebbal Flyover"),
        (12.9141, 77.6399, "Electronic City"),
        (13.0012, 77.5969, "Marathahalli"),
        (12.9784, 77.6408, "Indiranagar"),
    ],
    "chennai": [
        (13.0827, 80.2707, "Anna Salai"),
        (13.0604, 80.2496, "T Nagar"),
        (13.0067, 80.2206, "Adyar Junction"),
        (13.0569, 80.2425, "Alwarpet"),
        (13.1189, 80.1555, "Ambattur Industrial"),
        (13.0732, 80.2609, "Egmore"),
    ],
}

def _time_based_congestion_index(hour: int, minute: int, is_weekend: bool) -> int:
    """Returns a realistic congestion index (0-100) based on time of day."""
    t = hour + minute / 60.0
    if is_weekend:
        # Weekends: lighter peak, later
        if 7 <= t < 10:   return int(30 + (t - 7) * 10)
        if 10 <= t < 13:  return int(55 + (t - 10) * 5)
        if 13 <= t < 16:  return 65 + random.randint(-5, 8)
        if 16 <= t < 20:  return int(60 + (t - 16) * 5)
        if 20 <= t < 22:  return 55 + random.randint(-5, 5)
        return max(10, int(30 - (t - 22) * 5)) if t >= 22 else 20
    else:
        # Weekday: two rush peaks (8-10AM, 5-8PM)
        if 0 <= t < 6:    return random.randint(5, 20)   # night
        if 6 <= t < 7:    return random.randint(20, 38)  # early morning
        if 7 <= t < 8:    return random.randint(45, 62)  # building up
        if 8 <= t < 10:   return random.randint(72, 95)  # morning peak
        if 10 <= t < 12:  return random.randint(50, 68)  # mid morning
        if 12 <= t < 14:  return random.randint(60, 78)  # lunch rush
        if 14 <= t < 16:  return random.randint(45, 60)  # afternoon lull
        if 16 <= t < 17:  return random.randint(58, 74)  # building up
        if 17 <= t < 20:  return random.randint(75, 96)  # evening peak
        if 20 <= t < 22:  return random.randint(45, 65)  # winding down
        return random.randint(15, 35)                    # late night

async def _tomtom_segment_flow(lat: float, lng: float, key: str) -> Optional[int]:
    """Fetch real traffic flow index for a road segment via TomTom API."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                "https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json",
                params={"key": key, "point": f"{lat},{lng}", "unit": "KMPH"},
            )
            if resp.status_code != 200:
                return None
            data = resp.json().get("flowSegmentData", {})
            current_speed = data.get("currentSpeed", 0)
            free_flow = data.get("freeFlowSpeed", 1)
            if free_flow <= 0:
                return None
            # Congestion index: 0 = free flow, 100 = standstill
            ratio = current_speed / free_flow
            index = int((1 - ratio) * 100)
            return max(0, min(100, index))
    except Exception:
        return None

async def _get_traffic_zones(city: str) -> list[dict]:
    """Get congestion data — TomTom if key present, else time-based simulation."""
    now_ist = datetime.now(timezone.utc) + dt_module.timedelta(hours=5, minutes=30)
    hour, minute = now_ist.hour, now_ist.minute
    is_weekend = now_ist.weekday() >= 5  # Saturday=5, Sunday=6

    city_key = city.lower()
    road_points = _CITY_ROAD_POINTS.get(city_key)

    if TOMTOM_API_KEY and road_points:
        # Try fetching real TomTom data for known cities
        zones = []
        for lat, lng, label in road_points:
            index = await _tomtom_segment_flow(lat, lng, TOMTOM_API_KEY)
            if index is None:
                # Fallback to time-based for this segment
                base = _time_based_congestion_index(hour, minute, is_weekend)
                index = max(0, min(100, base + random.randint(-10, 10)))
            zones.append({
                "zone": label, "index": index,
                "source": "tomtom",
                "updated": datetime.now(timezone.utc).isoformat(),
            })
        return zones

    # Time-based smart simulation for all cities (no TomTom key or unknown city)
    zone_names = road_points or [
        (0, 0, f"{city} Central"),
        (0, 0, f"{city} North"),
        (0, 0, f"{city} South"),
        (0, 0, f"{city} East"),
        (0, 0, f"{city} West"),
        (0, 0, f"Old {city}"),
    ]
    base = _time_based_congestion_index(hour, minute, is_weekend)
    return [
        {
            "zone": label,
            "index": max(0, min(100, base + random.randint(-15, 15))),
            "source": "simulation",
            "updated": datetime.now(timezone.utc).isoformat(),
        }
        for _, _, label in zone_names
    ]

@router.get("/traffic")
async def get_traffic(city: str = Query(default="Hyderabad")) -> dict:
    """Real-time traffic congestion by zone (TomTom API) + advisories."""
    zones = await _get_traffic_zones(city)
    high_zones = [z["zone"] for z in zones if z["index"] > 75]
    advisories = _TRAFFIC_ADVISORIES.get(city.lower(), [])
    source = "tomtom" if (TOMTOM_API_KEY and city.lower() in _CITY_ROAD_POINTS) else "time_simulation"
    return {
        "city": city, "zones": zones,
        "high_congestion_zones": high_zones,
        "advisories": advisories,
        "source": source,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

class TrafficAdvisoryCreate(BaseModel):
    city: str
    message: str
    severity: str = "info"  # info/warn/alert

@router.post("/traffic/advisory", status_code=201)
async def post_traffic_advisory(
    body: TrafficAdvisoryCreate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Officer/Admin: Post a traffic advisory for a city."""
    if current_user.role not in ("officer", "admin"):
        raise HTTPException(403, "Only officers and admins can post advisories")
    if current_user.role == "officer" and current_user.city and current_user.city.lower() != body.city.lower():
        raise HTTPException(403, "You can only post advisories for your assigned city")
    entry = {
        "id": str(uuid.uuid4())[:8],
        "message": body.message, "severity": body.severity,
        "posted_by": current_user.name, "posted_at": datetime.now(timezone.utc).isoformat(),
    }
    key = body.city.lower()
    _TRAFFIC_ADVISORIES.setdefault(key, []).insert(0, entry)
    _TRAFFIC_ADVISORIES[key] = _TRAFFIC_ADVISORIES[key][:10]  # keep last 10
    return {"message": "Advisory posted", "advisory": entry}


# ── Public Transport ──────────────────────────────────────────────────────────

_TRANSPORT_DATA: dict[str, dict] = {
    "hyderabad": {
        "modes": [
            {"mode": "TSRTC Bus", "routes": 250, "frequency": "Every 10–30 min", "status": "ok", "detail": "All major routes operational. Route 5 (MGBS↔Secunderabad) delayed 10 min."},
            {"mode": "Hyderabad Metro", "routes": 3, "frequency": "Every 5–10 min", "status": "ok", "detail": "Red, Blue, Green lines running normally. Last trains at 11 PM."},
            {"mode": "MMTS Train", "routes": 2, "frequency": "Every 20–30 min", "status": "warn", "detail": "Lingampally–Secunderabad service delayed due to track maintenance."},
            {"mode": "City Cab (OLA/Uber)", "routes": None, "frequency": "On-demand", "status": "ok", "detail": "Surge pricing active in Banjara Hills and Gachibowli."},
        ],
        "helpline": "040-23450033",
    },
    "mumbai": {
        "modes": [
            {"mode": "BEST Bus", "routes": 400, "frequency": "Every 5–15 min", "status": "ok", "detail": "All routes operational. AC buses available on major corridors."},
            {"mode": "Mumbai Metro", "routes": 3, "frequency": "Every 5–8 min", "status": "ok", "detail": "Lines 1, 2A, 7 running normally. Line 2A extended to Dahisar."},
            {"mode": "Mumbai Local Train", "routes": 3, "frequency": "Every 3–5 min", "status": "ok", "detail": "Western, Central, Harbour lines operational. Peak hour rush."},
            {"mode": "Monorail", "routes": 1, "frequency": "Every 10 min", "status": "warn", "detail": "Limited service on Chembur–Wadala route."},
        ],
        "helpline": "022-26596100",
    },
    "delhi": {
        "modes": [
            {"mode": "DTC Bus", "routes": 300, "frequency": "Every 10–20 min", "status": "ok", "detail": "All routes operational. CNG buses on all corridors."},
            {"mode": "Delhi Metro", "routes": 9, "frequency": "Every 3–8 min", "status": "ok", "detail": "All lines running. Yellow line crowded at peak hours."},
            {"mode": "Delhi BRT", "routes": 1, "frequency": "Every 15 min", "status": "ok", "detail": "Ambedkar Nagar–Delhi Gate operational."},
        ],
        "helpline": "1800-111-847",
    },
}

_TRANSPORT_ALERTS: dict[str, list] = {}

@router.get("/transport")
async def get_transport(city: str = Query(default="Hyderabad")) -> dict:
    """Public transport routes and status for any city."""
    key = city.lower()
    data = _TRANSPORT_DATA.get(key)
    if not data:
        # Generic fallback for cities not in our static data
        data = {
            "modes": [
                {"mode": "City Bus", "routes": None, "frequency": "Check local schedule", "status": "ok", "detail": f"Contact {city} city transport authority for routes."},
                {"mode": "Auto/Cab", "routes": None, "frequency": "On-demand", "status": "ok", "detail": "OLA, Uber, and Rapido available in most cities."},
            ],
            "helpline": "Dial 100 (Police) for transport emergencies",
        }
    alerts = _TRANSPORT_ALERTS.get(key, [])
    return {"city": city, "modes": data["modes"], "helpline": data["helpline"], "alerts": alerts}

class TransportAlertCreate(BaseModel):
    city: str
    mode: str
    message: str
    severity: str = "info"

@router.post("/transport/alert", status_code=201)
async def post_transport_alert(
    body: TransportAlertCreate,
    current_user: User = Depends(get_current_user),
) -> dict:
    if current_user.role not in ("officer", "admin"):
        raise HTTPException(403, "Only officers and admins can post alerts")
    entry = {
        "id": str(uuid.uuid4())[:8], "mode": body.mode, "message": body.message,
        "severity": body.severity, "posted_by": current_user.name,
        "posted_at": datetime.now(timezone.utc).isoformat(),
    }
    key = body.city.lower()
    _TRANSPORT_ALERTS.setdefault(key, []).insert(0, entry)
    _TRANSPORT_ALERTS[key] = _TRANSPORT_ALERTS[key][:10]
    return {"message": "Alert posted", "alert": entry}


# ── Nearby Services (OpenStreetMap Overpass) ──────────────────────────────────

SERVICE_QUERIES: dict[str, str] = {
    "hospital":    'node["amenity"="hospital"]',
    "clinic":      'node["amenity"="clinic"]',
    "pharmacy":    'node["amenity"="pharmacy"]',
    "police":      'node["amenity"="police"]',
    "fire":        'node["amenity"="fire_station"]',
    "atm":         'node["amenity"="atm"]',
    "toilet":      'node["amenity"="toilets"]',
    "ev_charging": 'node["amenity"="charging_station"]',
    "bank":        'node["amenity"="bank"]',
}

# City center coordinates (lat, lng) for Overpass radius search
CITY_COORDS: dict[str, tuple[float, float]] = {
    "hyderabad": (17.3850, 78.4867), "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090), "chennai": (13.0827, 80.2707),
    "bengaluru": (12.9716, 77.5946), "kolkata": (22.5726, 88.3639),
    "pune": (18.5204, 73.8567), "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873), "lucknow": (26.8467, 80.9462),
    "surat": (21.1702, 72.8311), "visakhapatnam": (17.6868, 83.2185),
    "kochi": (9.9312, 76.2673), "coimbatore": (11.0168, 76.9558),
    "chandigarh": (30.7333, 76.7794), "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577), "patna": (25.5941, 85.1376),
    "nagpur": (21.1458, 79.0882), "ranchi": (23.3441, 85.3096),
}

async def _fetch_osm_nearby(lat: float, lng: float, service_type: str, radius_m: int = 3000) -> list[dict]:
    """Query OpenStreetMap Overpass API for nearby services. Completely free."""
    query_filter = SERVICE_QUERIES.get(service_type, 'node["amenity"="hospital"]')
    overpass_query = f"""
    [out:json][timeout:15];
    {query_filter}(around:{radius_m},{lat},{lng});
    out body 20;
    """
    try:
        headers = {"User-Agent": "CivicosSmartCityApp/1.0", "Accept": "*/*"}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query},
                headers=headers
            )
            if resp.status_code != 200:
                return []
            nodes = resp.json().get("elements", [])
            results = []
            for node in nodes[:15]:
                tags = node.get("tags", {})
                name = tags.get("name") or tags.get("name:en") or tags.get("operator") or service_type.title()
                results.append({
                    "id": node["id"],
                    "name": name,
                    "type": service_type,
                    "lat": node.get("lat"), "lng": node.get("lon"),
                    "address": tags.get("addr:full") or tags.get("addr:street") or "",
                    "phone": tags.get("phone") or tags.get("contact:phone") or "",
                    "opening_hours": tags.get("opening_hours") or "",
                    "source": "openstreetmap",
                })
            return results
    except Exception as e:
        logger.warning(f"Overpass API error: {e}")
        return []

@router.get("/nearby")
async def get_nearby_services(
    city: str = Query(default="Hyderabad"),
    service_type: str = Query(default="hospital"),
    lat: Optional[float] = Query(default=None),
    lng: Optional[float] = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """
    Nearby essential services via OpenStreetMap Overpass API.
    Pass lat/lng for precise location, or just city name for city-center results.
    """
    if service_type not in SERVICE_QUERIES:
        raise HTTPException(400, f"Invalid service_type. Choose from: {list(SERVICE_QUERIES.keys())}")

    # Use provided coords or look up city center
    if lat is None or lng is None:
        coords = CITY_COORDS.get(city.lower())
        if coords:
            lat, lng = coords
        else:
            lat, lng = 17.3850, 78.4867  # fallback to Hyderabad

    services = await _fetch_osm_nearby(lat, lng, service_type)

    # Also check DB for admin-added entries
    db_entries = db.query(NearbyService).filter(
        NearbyService.city.ilike(city),
        NearbyService.service_type == service_type,
        NearbyService.is_active == True,
    ).all()
    db_results = [{
        "id": str(s.id), "name": s.name, "type": s.service_type,
        "lat": s.lat, "lng": s.lng, "address": s.address or "",
        "phone": s.phone or "", "opening_hours": "", "source": "admin",
    } for s in db_entries]

    all_results = db_results + services
    return {
        "city": city, "service_type": service_type,
        "lat": lat, "lng": lng,
        "count": len(all_results),
        "services": all_results,
    }

class NearbyServiceCreate(BaseModel):
    city: str
    name: str
    service_type: str
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None

@router.post("/nearby", status_code=201)
async def add_nearby_service(
    body: NearbyServiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if current_user.role != "admin":
        raise HTTPException(403, "Only admins can add service locations")
    if body.service_type not in SERVICE_QUERIES:
        raise HTTPException(400, f"Invalid service_type. Choose from: {list(SERVICE_QUERIES.keys())}")
    svc = NearbyService(
        city=body.city, name=body.name, service_type=body.service_type,
        address=body.address, lat=body.lat, lng=body.lng, phone=body.phone,
        added_by=current_user.id,
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return {"message": "Service added", "id": str(svc.id)}


# ── Parking ────────────────────────────────────────────────────────────────────

def _parking_occupancy_factor(hour: int, minute: int, is_weekend: bool, spot_type: str) -> float:
    """
    Returns an occupancy factor 0.0–1.0 based on time of day, day type, and spot type.
    Mall and commercial spots fill up differently from hospital/station spots.
    """
    t = hour + minute / 60.0
    if spot_type == "mall":
        # Malls busiest 11AM–8PM, quiet at night
        if is_weekend:
            if 10 <= t < 13: return 0.45 + (t - 10) * 0.12
            if 13 <= t < 20: return 0.80 + random.uniform(-0.05, 0.08)
            if 20 <= t < 22: return 0.55 + random.uniform(-0.05, 0.05)
        else:
            if 10 <= t < 13: return 0.30 + (t - 10) * 0.08
            if 13 <= t < 18: return 0.55 + random.uniform(-0.05, 0.08)
            if 18 <= t < 21: return 0.75 + random.uniform(-0.05, 0.08)
        return 0.10 + random.uniform(0, 0.10)
    elif spot_type == "station":
        # Station busiest at commute times
        if 7 <= t < 10 or 17 <= t < 20:
            return 0.80 + random.uniform(-0.05, 0.12)
        if 6 <= t < 7 or 20 <= t < 22:
            return 0.50 + random.uniform(-0.05, 0.05)
        if 0 <= t < 6 or 22 <= t <= 24:
            return 0.10 + random.uniform(0, 0.08)
        return 0.55 + random.uniform(-0.10, 0.10)
    elif spot_type == "hospital":
        # Hospitals busy all day, quieter at night
        if 8 <= t < 20:
            return 0.65 + random.uniform(-0.10, 0.15)
        return 0.25 + random.uniform(-0.05, 0.08)
    else:
        # Central / office areas: weekday peaks, weekend lighter
        if is_weekend:
            if 10 <= t < 20: return 0.55 + random.uniform(-0.10, 0.12)
            return 0.15 + random.uniform(0, 0.10)
        else:
            if 8 <= t < 10 or 17 <= t < 19: return 0.82 + random.uniform(-0.05, 0.10)
            if 10 <= t < 17: return 0.68 + random.uniform(-0.08, 0.10)
            if 19 <= t < 22: return 0.45 + random.uniform(-0.05, 0.08)
            return 0.10 + random.uniform(0, 0.08)

def _seed_parking(city: str, db: Session):
    """Seed demo parking data for a city if none exists (initial structure only)."""
    if db.query(ParkingLocation).filter(ParkingLocation.city.ilike(city)).count() > 0:
        return
    coords = CITY_COORDS.get(city.lower(), (17.3850, 78.4867))
    spots = [
        {"name": f"{city} Central Plaza Parking", "address": f"Near City Center, {city}", "total": 320, "type": "multi-level", "paid": True, "rate": 30.0, "kind": "central"},
        {"name": f"{city} City Mall Parking", "address": f"Shopping District, {city}", "total": 500, "type": "covered", "paid": True, "rate": 40.0, "kind": "mall"},
        {"name": f"{city} Railway Station Parking", "address": f"Railway Station Area, {city}", "total": 200, "type": "open", "paid": True, "rate": 20.0, "kind": "station"},
        {"name": f"{city} General Hospital Parking", "address": f"Hospital District, {city}", "total": 150, "type": "open", "paid": False, "rate": None, "kind": "hospital"},
        {"name": f"{city} Tech Park Parking", "address": f"IT Corridor, {city}", "total": 800, "type": "multi-level", "paid": True, "rate": 25.0, "kind": "central"},
    ]
    for s in spots:
        # Seed with 50% occupancy as baseline (live engine overrides on GET)
        db.add(ParkingLocation(
            city=city, name=s["name"], address=s["address"],
            lat=coords[0] + random.uniform(-0.03, 0.03),
            lng=coords[1] + random.uniform(-0.03, 0.03),
            total_slots=s["total"], available_slots=int(str(s["total"])) // 2,
            parking_type=s["type"], is_paid=s["paid"], rate_per_hour=s["rate"],
        ))
    db.commit()

# Map parking name keywords → kind (for time-pattern matching)
def _infer_parking_kind(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ("mall", "shop", "market", "plaza")): return "mall"
    if any(k in n for k in ("station", "railway", "bus", "airport")): return "station"
    if any(k in n for k in ("hospital", "clinic", "health", "medical")): return "hospital"
    return "central"

@router.get("/parking")
async def get_parking(city: str = Query(default="Hyderabad"), db: Session = Depends(get_db)) -> dict:
    """Live parking availability — occupancy updates dynamically based on time-of-day patterns."""
    _seed_parking(city, db)
    spots = db.query(ParkingLocation).filter(ParkingLocation.city.ilike(city)).all()

    # Compute IST time for occupancy factor
    now_ist = datetime.now(timezone.utc) + dt_module.timedelta(hours=5, minutes=30)
    hour, minute = now_ist.hour, now_ist.minute
    is_weekend = now_ist.weekday() >= 5

    results = []
    for s in spots:
        kind = _infer_parking_kind(s.name)
        factor = _parking_occupancy_factor(hour, minute, is_weekend, kind)
        # If officer hasn't updated manually in last hour, use time-based value
        one_hour_ago = datetime.now(timezone.utc) - dt_module.timedelta(hours=1)
        use_live = s.last_updated_by is None or s.updated_at < one_hour_ago
        if use_live:
            live_available = max(0, int(s.total_slots * (1.0 - factor)))
        else:
            live_available = s.available_slots  # officer-updated value

        pct_available = round((live_available / max(s.total_slots, 1)) * 100)
        occupancy_pct = 100 - pct_available
        results.append({
            "id": str(s.id), "name": s.name, "address": s.address,
            "lat": s.lat, "lng": s.lng,
            "total_slots": s.total_slots, "available_slots": live_available,
            "occupancy_pct": occupancy_pct,
            "parking_type": s.parking_type, "is_paid": s.is_paid,
            "rate_per_hour": s.rate_per_hour,
            "status": "available" if pct_available > 20 else ("limited" if pct_available > 5 else "full"),
            "source": "live_simulation" if use_live else "officer_update",
            "updated_at": now_ist.isoformat() if use_live else s.updated_at.isoformat(),
        })
    return {"city": city, "count": len(results), "parking": results, "as_of": now_ist.strftime("%H:%M IST")}

class ParkingUpdate(BaseModel):
    available_slots: int

@router.patch("/parking/{parking_id}")
async def update_parking(
    parking_id: str,
    body: ParkingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if current_user.role not in ("officer", "admin"):
        raise HTTPException(403, "Only officers and admins can update parking")
    spot = db.query(ParkingLocation).filter(ParkingLocation.id == uuid.UUID(parking_id)).first()
    if not spot:
        raise HTTPException(404, "Parking location not found")
    if current_user.role == "officer" and current_user.city and spot.city.lower() != current_user.city.lower():
        raise HTTPException(403, "You can only update parking in your assigned city")
    spot.available_slots = max(0, min(body.available_slots, spot.total_slots))
    spot.last_updated_by = current_user.id
    db.commit()
    return {"message": "Parking updated", "available_slots": spot.available_slots}


# ── Utility Status (thin wrapper around existing city-telemetry) ──────────────

@router.get("/utility")
async def get_utility_status(city: str = Query(default="Hyderabad")) -> dict:
    """
    Live utility service status for a city.
    Wraps the existing /live/city-telemetry services data.
    """
    # Re-use the in-memory _CITY_SERVICES from live_data module
    try:
        from routers.live_data import _CITY_SERVICES, _seed_data
        _seed_data()
        services = [dict(s) for s in _CITY_SERVICES]
    except Exception:
        services = []

    return {
        "city": city,
        "services": services,
        "note": "Live data. Officers/admins can update via PATCH /live/city-services/{id}",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── City Events & Announcements ───────────────────────────────────────────────

def _seed_events(city: str, db: Session, current_user_id: uuid.UUID):
    """Seed demo events for a city."""
    if db.query(CityEvent).filter(CityEvent.city.ilike(city)).count() > 0:
        return
    now = datetime.now(timezone.utc)
    samples = [
        {"title": f"{city} Marathon 2025", "description": f"Annual {city} Marathon — 5K, 10K, 21K, 42K categories open for registration.", "category": "marathon", "location": f"Rajiv Gandhi Stadium, {city}", "event_date": now + dt_module.timedelta(days=14), "status": "published"},
        {"title": "Republic Day Parade Route Closure", "description": "Certain roads will be closed on 26th January from 6 AM to 12 PM for the Republic Day parade.", "category": "road_closure", "location": f"Central Avenue, {city}", "event_date": now + dt_module.timedelta(days=5), "status": "published"},
        {"title": f"{city} Trade Exhibition 2025", "description": f"Annual trade and business exhibition at {city} Exhibition Grounds. Free entry for citizens.", "category": "exhibition", "location": f"Exhibition Grounds, {city}", "event_date": now + dt_module.timedelta(days=30), "status": "published"},
        {"title": "Smart City Tech Fest", "description": "Technology and innovation festival celebrating urban development. Includes drone shows and EV expo.", "category": "festival", "location": f"Hi-Tech City, {city}", "event_date": now + dt_module.timedelta(days=21), "status": "draft"},
    ]
    for s in samples:
        db.add(CityEvent(
            city=city, title=s["title"], description=s["description"],
            category=s["category"], location=s["location"],
            event_date=s["event_date"], status=s["status"],
            created_by=current_user_id, published_by=current_user_id if s["status"] == "published" else None,
        ))
    db.commit()

@router.get("/events")
async def get_events(
    city: str = Query(default="Hyderabad"),
    category: Optional[str] = Query(default=None),
    status: str = Query(default="published"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> dict:
    """City events and announcements. Citizens see published only; officers/admins see drafts too."""
    # Seed demo data on first load using admin user id (fallback)
    try:
        if current_user:
            _seed_events(city, db, current_user.id)
    except Exception:
        pass

    query = db.query(CityEvent).filter(CityEvent.city.ilike(city))

    # Citizens only see published events
    if not current_user or current_user.role == "citizen":
        query = query.filter(CityEvent.status == "published")
    elif status != "all":
        query = query.filter(CityEvent.status == status)

    if category:
        query = query.filter(CityEvent.category == category)

    events = query.order_by(CityEvent.event_date.asc()).all()
    results = [{
        "id": str(e.id), "city": e.city, "title": e.title,
        "description": e.description, "category": e.category,
        "location": e.location,
        "event_date": e.event_date.isoformat() if e.event_date else None,
        "end_date": e.end_date.isoformat() if e.end_date else None,
        "status": e.status,
        "created_at": e.created_at.isoformat(),
    } for e in events]

    return {"city": city, "count": len(results), "events": results}

class EventCreate(BaseModel):
    city: str
    title: str
    description: str
    category: str  # marathon/festival/road_closure/exhibition/announcement
    location: Optional[str] = None
    event_date: Optional[str] = None  # ISO string
    end_date: Optional[str] = None

@router.post("/events", status_code=201)
async def create_event(
    body: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if current_user.role not in ("officer", "admin"):
        raise HTTPException(403, "Only officers and admins can create events")
    if current_user.role == "officer" and current_user.city and body.city.lower() != current_user.city.lower():
        raise HTTPException(403, "You can only create events for your assigned city")

    event_date = datetime.fromisoformat(body.event_date) if body.event_date else None
    end_date = datetime.fromisoformat(body.end_date) if body.end_date else None
    status = "published" if current_user.role == "admin" else "draft"

    ev = CityEvent(
        city=body.city, title=body.title, description=body.description,
        category=body.category, location=body.location,
        event_date=event_date, end_date=end_date,
        status=status, created_by=current_user.id,
        published_by=current_user.id if status == "published" else None,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return {"message": "Event created", "id": str(ev.id), "status": status}

class EventUpdate(BaseModel):
    status: Optional[str] = None  # published/archived/draft
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

@router.patch("/events/{event_id}")
async def update_event(
    event_id: str,
    body: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ev = db.query(CityEvent).filter(CityEvent.id == uuid.UUID(event_id)).first()
    if not ev:
        raise HTTPException(404, "Event not found")
    if current_user.role == "citizen":
        raise HTTPException(403, "Citizens cannot update events")
    # Officers can edit drafts only; admins can do anything
    if current_user.role == "officer" and body.status == "published":
        raise HTTPException(403, "Officers cannot publish events — contact an admin")
    if body.status:
        ev.status = body.status
        if body.status == "published" and not ev.published_by:
            ev.published_by = current_user.id
    if body.title: ev.title = body.title
    if body.description: ev.description = body.description
    if body.location: ev.location = body.location
    db.commit()
    return {"message": "Event updated", "id": event_id, "status": ev.status}

@router.delete("/events/{event_id}", status_code=200)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if current_user.role != "admin":
        raise HTTPException(403, "Only admins can delete events")
    ev = db.query(CityEvent).filter(CityEvent.id == uuid.UUID(event_id)).first()
    if not ev:
        raise HTTPException(404, "Event not found")
    db.delete(ev)
    db.commit()
    return {"message": "Event deleted"}


# ── City-Aware AI Chat ────────────────────────────────────────────────────────

class SmartCityChat(BaseModel):
    city: str
    message: str
    language: str = "en"
    history: list[dict] = []

LANGUAGE_NAMES = {"en": "English", "hi": "Hindi", "te": "Telugu", "ta": "Tamil"}

@router.post("/chat")
async def smart_city_chat(body: SmartCityChat) -> dict:
    """
    City-aware AI chatbot for Smart City. Injects city name into the system prompt.
    Proxies to Groq with the smart-city module context.
    """
    lang_name = LANGUAGE_NAMES.get(body.language, "English")
    city = body.city or "your city"

    system_prompt = (
        f"You are a Smart City Citizen Assistant for {city}, India. "
        f"Help citizens with city-specific information including: "
        f"traffic updates and congestion in {city}, public transport routes and schedules in {city}, "
        f"nearby hospitals, police stations, ATMs and essential services in {city}, "
        f"parking availability, weather and air quality in {city}, "
        f"power outages and water supply interruptions, "
        f"city events, marathons, road closures, and public announcements in {city}. "
        f"Provide accurate, helpful, and concise answers. "
        f"When you don't know specific real-time data, guide the user to the right authority or helpline. "
        f"IMPORTANT: Respond entirely in {lang_name}. Use simple, clear language accessible to all citizens."
    )

    mock_responses = {
        "en": f"I'm your Smart City assistant for {city}! I can help you with traffic updates, public transport, nearby services, weather, parking, and city events. What would you like to know?",
        "hi": f"मैं {city} का स्मार्ट सिटी सहायक हूं! मैं ट्रैफिक, बस/मेट्रो, पास की सेवाओं, मौसम और पार्किंग में मदद कर सकता हूं। आप क्या जानना चाहते हैं?",
        "te": f"నేను {city} స్మార్ట్ సిటీ సహాయకుడిని! ట్రాఫిక్, రవాణా, సమీప సేవలు, వాతావరణం మరియు పార్కింగ్ గురించి సహాయం చేయగలను.",
        "ta": f"நான் {city} ஸ்மார்ட் சிட்டி உதவியாளர்! போக்குவரத்து, பேருந்து, அருகில் உள்ள சேவைகள், வானிலை மற்றும் பார்க்கிங் பற்றி உதவ முடியும்.",
    }

    if not GROQ_API_KEY:
        return {"reply": mock_responses.get(body.language, mock_responses["en"]), "is_mock": True}

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        messages: Any = [{"role": "system", "content": system_prompt}]
        for h in body.history[-10:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": body.message})

        resp = client.chat.completions.create(
            model="llama3-8b-8192", messages=messages, max_tokens=512, temperature=0.7,
        )
        reply = resp.choices[0].message.content.strip() if resp.choices[0].message.content else ""
        return {"reply": reply, "is_mock": False}
    except Exception as e:
        logger.error(f"Smart City AI error: {e}")
        return {"reply": mock_responses.get(body.language, mock_responses["en"]), "is_mock": True}
