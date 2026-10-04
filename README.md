# RideToday 🏍️

A quick weather check and gear call for motorcycle riders. Front-end only: React + Tailwind CSS, no backend and no API keys.

## Features

- **Local weather.** Uses your browser location, or you can search for any city.
- **Riding radius or route.**
  - *Radius:* checks the weather at up to 13 points across your riding radius for the whole ride window, and plans for the worst of them.
  - *A to B route:* follows the real road route and checks the weather at each checkpoint for the time you'll reach it. Round trips are supported.
- **Ride-O-Meter.** A 0–100 score shown on a speedometer gauge, with a verdict ("Send it!" down to "Maybe take the cage").
- **Wind chill at speed.** Pick City, Backroads or Highway and the app works out how cold the air feels on the bike.
- **Gear loadout.** A cartoon rider is dressed in the recommended gear (helmet, layers, jacket, gloves, pants, boots, rain gear and extras), and each item comes with the reason for it.
- **Comfort preference.** *Toasty* (you get cold easily), *Normal* or *Cool* (you run hot). This moves the gear thresholds by about 4 °C.
- **ATGATT mode.** All The Gear, All The Time: armored pants, over-ankle boots, a full-face helmet and a back protector, whatever the weather.
- **Road report.** Warnings for wet roads, gusts, thunderstorms, ice, fog, riding after dark, heat stress and UV.
- **Hour-by-hour strip** with the ride window highlighted, and a **map** of your radius or route.
- **Light and dark mode** (or follow the system setting), plus °F/°C units. Settings are remembered in `localStorage`.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (vitest)
npm run build    # type-check + production build to dist/
```

## Data sources

All are free and need no keys. They are called straight from the browser:

| What | Service |
| --- | --- |
| Forecast | [Open-Meteo](https://open-meteo.com/) |
| City search | Open-Meteo Geocoding |
| Place name for your location | BigDataCloud reverse geocode (client endpoint) |
| Road routing | Public [OSRM](https://project-osrm.org/) demo server (falls back to a straight-line estimate) |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org/) via Leaflet |

## Project layout

```
src/
  lib/          pure logic: weather fetch + aggregation, geo math, gear engine, units
  hooks/        useRideForecast, useTheme, useStoredState
  components/   UI (Ride-O-Meter, RiderAvatar, GearLoadout, RideMap, …)
```

The gear and score rules live in `src/lib/gear.ts`, and that file is the place to tune them.

> Gear suggestions are only a starting point. You know your bike, your body and your roads best. Ride safe.
