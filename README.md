# RideToday 🏍️

A quick weather check and gear call for motorcycle riders. Front-end only: React + Tailwind CSS, no backend and no API keys.

## Features

- **Local weather.** Uses your browser location, or you can search for any city.
- **Riding radius or route.**
  - *Radius:* checks the weather at up to 13 points across your riding radius for the whole ride window, and plans for the worst of them.
  - *A to B route:* follows the real road route and checks the weather at each checkpoint for the time you'll reach it. Round trips are supported.
- **🎲 Just ride.** No destination? Choose how long you want to ride. The app plans a loop on motorcycle-friendly backroads that brings you back home.
  - It tries several candidate loops and rates each one for twistiness, hills, not doubling back, and how close it is to your ride time. You get a **Fun rating /10**, and **Another route** moves to the next candidate.
  - It suggests **gas, food and bar stops** along the loop: gas early or midway, food around halfway, bars at the finish (after you park the bike). You can choose which stops to add.
  - Take it with you via **Open in Google Maps** or a **GPX file** for your GPS.
- **Saved routes.** Save Just ride loops and A → B routes in your browser, and mark one as your 🏠 **home route** for one-tap rides. Loops keep their exact route, simplified to about 5 m, which is roughly 3–7 KB each. A → B routes keep only their endpoints (~250 bytes) and are re-routed when loaded. Nothing leaves your device.
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
yarn install
yarn dev         # http://localhost:5173
yarn test        # unit tests (vitest)
yarn build       # type-check + production build to dist/
```

## Data sources

All are free and need no keys. They are called straight from the browser:

| What | Service |
| --- | --- |
| Forecast | [Open-Meteo](https://open-meteo.com/) |
| City search | Open-Meteo Geocoding |
| Place name for your location | BigDataCloud reverse geocode (client endpoint) |
| Road routing (A to B) | Public [OSRM](https://project-osrm.org/) demo server (falls back to a straight-line estimate) |
| Loop routing (Just ride) | [Valhalla](https://valhalla.github.io/valhalla/) motorcycle costing on the FOSSGIS server (`valhalla1.openstreetmap.de`) |
| Gas / food / bar stops | OpenStreetMap via the [Overpass API](https://overpass-api.de/) |
| Hills (elevation) | Open-Meteo Elevation API |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org/) via Leaflet |

## Project layout

```
src/
  lib/          pure logic: weather fetch + aggregation, geo math, gear engine, units
  hooks/        useRideForecast, useTheme, useStoredState
  components/   UI (Ride-O-Meter, RiderAvatar, GearLoadout, RideMap, …)
```

The gear and score rules live in `src/lib/gear.ts`. Loop planning and the fun rating live in `src/lib/loop.ts`, and stop picking lives in `src/lib/stops.ts`. Those are the places to tune them.

> Gear suggestions are only a starting point. You know your bike, your body and your roads best. Ride safe.

## License

[MIT](LICENSE)
