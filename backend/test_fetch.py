import httpx
import asyncio

async def main():
    url = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070'
    params = {'api-key': '579b464db66ec23bdd000001821c50c51ce042905f611f39cbd16cc7', 'format': 'json', 'limit': '10', 'filters[commodity]': 'Wheat'}
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            r = await client.get(url, params=params)
            print("Status:", r.status_code)
            print("Content:", r.text[:200])
    except Exception as e:
        print('Error:', repr(e))

if __name__ == '__main__':
    asyncio.run(main())
