import httpx, asyncio

async def main():
    q = '[out:json][timeout:15];node["amenity"="hospital"](around:3000,17.3850,78.4867);out body 2;'
    headers = {"User-Agent": "CivicosSmartCityApp/1.0", "Accept": "*/*"}
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://overpass-api.de/api/interpreter", data={"data": q}, headers=headers)
        print("Status:", resp.status_code)
        print("Body:", resp.text[:300])

asyncio.run(main())
