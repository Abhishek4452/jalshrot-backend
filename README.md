# JalSrot — Backend API

Express + MongoDB API for the JalSrot water resource registry. It powers the public source registry, the admin dashboard, field-hardware water-height ingestion, and the gallery.

- **Runtime:** Node.js 18+
- **Framework:** Express 5
- **Database:** MongoDB Atlas (Mongoose 9)
- **Auth:** JWT bearer tokens (`30d` expiry)
- **Frontend:** [`../web/shrot-v1.0.0`](../web/shrot-v1.0.0/README.md)

## Quick start

```bash
npm install
cp .env.example .env   # fill in MongoDB + JWT secrets
npm run dev            # nodemon → http://localhost:5000
```

Health check:

```bash
curl http://localhost:5000/api/health
# { "ok": true, "uptime": 12.34 }
```

### Scripts

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Start with nodemon (auto-restarts on file edits). |
| `npm start`             | Start once with Node.                            |
| `npm run seed`          | Insert 10 demo sources if the DB is empty.        |
| `npm run seed -- --reset` | Delete existing sources, then insert demo data. |

> `--reset` permanently removes every water source in the connected database. Use it only on a demo database.

## Environment

Copy `.env.example` to `.env` and configure:

| Variable           | Required | Default       | Purpose                                                        |
| ------------------ | -------- | ------------- | -------------------------------------------------------------- |
| `MONGO_URI`        | Yes*     | —             | MongoDB connection string.                                     |
| `MONGODB_URI`      | Yes*     | —             | Alternative name for `MONGO_URI` (either one works).           |
| `MONGO_DB`         | No       | `jalsrot`     | Database name used only when the URI has no database path.      |
| `JWT_SECRET`       | Yes      | —             | Long random string used to sign login tokens.                   |
| `PORT`             | No       | `5000`        | HTTP port.                                                     |
| `CLIENT_ORIGIN`    | No       | all origins   | Comma-separated allowed frontend origins for CORS.             |
| `GOVERNMENT_EMAILS`| No       | —             | Comma-separated emails always treated as government admins.     |
| `HARDWARE_API_KEY` | For sensors | —          | Shared key field devices send as `x-api-key`.                   |

\* One of `MONGO_URI` / `MONGODB_URI` must be set. If the connection string already contains a database name (e.g. `.../jalsrot?...`), that name wins over `MONGO_DB`.

The server exits on startup if `JWT_SECRET` is missing, and hardware ingestion returns `503` until `HARDWARE_API_KEY` is set. Restart the server after changing either value.

> **Never commit `.env`.** Keep `HARDWARE_API_KEY` and `JWT_SECRET` private.

## Roles & authentication

| Role              | How it is assigned                                      | Can manage sources | Can manage users |
| ----------------- | ------------------------------------------------------- | ------------------ | ---------------- |
| `government`      | First registered account, an email in `GOVERNMENT_EMAILS`, or promoted in DB | Yes | Yes |
| `public`          | Default for later registrations                          | Only if `canManageSources` is granted | No |

Send the token on protected requests:

```http
Authorization: Bearer <jwt>
```

Middleware in `middleware/authMiddleware.js`:

- `protect` — requires a valid JWT.
- `requireGovernment` — `role === "government"`.
- `requireSourceManager` — government **or** `canManageSources`.

## API reference

All responses are JSON. Errors use `{ "error": "message" }` with an appropriate status code.

### Health

| Method | Path          | Access | Description        |
| ------ | ------------- | ------ | ------------------ |
| GET    | `/api/health` | Public | Uptime/health check. |

### Auth — `/api/auth`

| Method | Path                                  | Access    | Body / notes                                      |
| ------ | ------------------------------------- | --------- | ------------------------------------------------- |
| POST   | `/register`                           | Public    | `{ email, password }` — password min 6 chars.      |
| POST   | `/login`                              | Public    | `{ email, password }` → `{ token, user }`.         |
| GET    | `/me`                                 | Token     | Current user profile.                              |
| PATCH  | `/region`                             | Token     | `{ state, district }` — marks region as completed. |
| GET    | `/users`                              | Government| List all users.                                    |
| PATCH  | `/users/:userId/source-permission`    | Government| `{ canManageSources: boolean }`.                   |

`user` shape:

```json
{
  "id": "…",
  "email": "admin@example.com",
  "state": "Uttarakhand",
  "district": "Pauri Garhwal",
  "regionCompleted": true,
  "role": "government",
  "canManageSources": true
}
```

### Water sources — `/api/water-sources`

| Method | Path                 | Access          | Description                                      |
| ------ | -------------------- | --------------- | ------------------------------------------------ |
| GET    | `/`                  | Public          | List sources (supports filters below).            |
| GET    | `/stats/summary`     | Public          | Counts plus `byType`, `byCondition`, states, districts. |
| GET    | `/:id`               | Public          | Single source.                                    |
| POST   | `/` or `/add`        | Source manager  | Create a source. `/add` is kept for compatibility. |
| PATCH  | `/:id`               | Source manager  | Update a source (partial payload).                |
| DELETE | `/:id`               | Source manager  | Delete a source.                                  |

Supported query filters on `GET /`:

| Query        | Example                       | Notes                                      |
| ------------ | ----------------------------- | ------------------------------------------ |
| `search`     | `?search=unchar`              | Name, village, district, state (case-insensitive). |
| `state`      | `?state=Uttarakhand`          | Exact, case-insensitive.                   |
| `district`   | `?district=Pauri%20Garhwal`   | Exact, case-insensitive.                   |
| `sourceType` | `?sourceType=spring,tap`      | Comma-separated: `well`, `borewell`, `river`, `pond`, `spring`, `tap`, `waterfall`. |
| `condition`  | `?condition=good`             | `good`, `moderate`, `poor`.                |
| `potable`    | `?potable=true`               | Boolean as string.                         |

Source payload highlights:

```json
{
  "name": "Unchar Spring",
  "sourceType": "spring",
  "latitude": 30.17656,
  "longitude": 78.69082,
  "village": "Unchar",
  "district": "Pauri Garhwal",
  "state": "Uttarakhand",
  "ph": 7.2,
  "quality": { "tds": 50, "turbidity": 4 },
  "isPotable": true,
  "seasonal": false,
  "condition": "good",
  "verified": true,
  "usersPerDay": 120,
  "distanceFromVillage": 1.5,
  "notes": "…",
  "area": 250,
  "deviceId": "jalsrot-sensor-01"
}
```

- Location is stored as GeoJSON (`[longitude, latitude]`) and returned with flat `latitude` / `longitude` fields for the frontend.
- `area` is the **storage area in m²**, configured by an administrator.
- `deviceId` is the hardware identifier and must be unique across sources.
- `volume` / `latestHeight` / `lastReadingAt` are maintained by the hardware endpoint and should not be edited manually.

### Hardware readings — `/api/hardware`

| Method | Path                 | Access         | Description                        |
| ------ | -------------------- | -------------- | ---------------------------------- |
| POST   | `/readings` (or `/`) | `x-api-key`    | Ingest a water-height measurement. |
| GET    | `/readings/:sourceId`| Source manager | Latest readings (max 500 via `?limit=`). |

Ingest body:

```json
{
  "deviceId": "jalsrot-sensor-01",
  "height": 75,
  "unit": "cm",
  "recordedAt": "2026-10-26T09:30:00Z"
}
```

- Provide **either** `deviceId` or `sourceId`.
- `unit` accepts `m` (default), `cm`, or `mm` and is normalized to metres.
- `recordedAt` is optional; omit it to use the server time.
- Height must be a non-negative number below 100 m.
- A device can bind itself to a source that has no `deviceId` yet.

Example:

```bash
curl -X POST http://localhost:5000/api/hardware/readings \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: YOUR_HARDWARE_API_KEY' \
  -d '{"deviceId":"jalsrot-sensor-01","height":75,"unit":"cm"}'
```

Response:

```json
{
  "ok": true,
  "source": {
    "id": "…",
    "name": "Unchar Spring",
    "area": 250,
    "latestHeight": 0.75,
    "volume": 187.5,
    "lastReadingAt": "2026-10-26T09:30:00.000Z"
  },
  "reading": { "id": "…", "height": 0.75, "volume": 187.5, "…": "…" }
}
```

**Volume formula**

```text
volume (m³) = area (m²) × latestHeight (m)
```

If the source has no `area`, the reading is still stored in history but `volume` stays empty until an administrator sets the area. Patching `area` recalculates `volume` immediately from the latest height.

### Gallery — `/api/gallery`

| Method | Path    | Access         | Description                          |
| ------ | ------- | -------------- | ------------------------------------ |
| GET    | `/`     | Public         | List media, newest first.            |
| POST   | `/`     | Source manager | Add a photo or video by URL.         |
| PATCH  | `/:id`  | Source manager | Update title/caption/thumbnail/URL.  |
| DELETE | `/:id`  | Source manager | Delete an item.                      |

Create body:

```json
{
  "title": "Spring monitoring, Unchar",
  "type": "image",
  "url": "https://example.com/photo.jpg",
  "thumbnailUrl": "https://example.com/cover.jpg",
  "caption": "Optional description"
}
```

- `type` is `image` or `video`; when omitted it is inferred from the URL.
- Supported video URLs: YouTube, Vimeo, and direct `.mp4` / `.webm` / `.ogg` / `.mov` links.
- Only `http(s)` URLs are accepted. There are no file uploads — media is hosted elsewhere.
- Items are returned with both `_id` and `id`.

## Data models

### `User`

`email`, `password` (bcrypt hash, never returned), `state`, `district`, `regionCompleted`, `role` (`public | government`), `canManageSources`, timestamps.

### `WaterSource`

`name`, `sourceType`, GeoJSON `location`, `village`, `district`, `state`, `ph`, `quality` (`tds`, `electricalConductivity`, `turbidity`, `totalAlkalinity`, `totalAcidity`, `totalHardness`, `chlorides`), `isPotable`, `lastTestedAt`, `duration`, `seasonal`, `usersPerDay`, `distanceFromVillage`, `area`, `deviceId`, `latestHeight`, `volume`, `lastReadingAt`, `condition`, `lastMaintenanceAt`, `notes`, `verified`, `createdBy`, `updatedBy`, timestamps.

Indexes: geospatial `2dsphere` on `location`; unique sparse index on `deviceId`.

### `WaterReading`

A single sensor measurement: `source`, `deviceId`, `height` (m), `heightUnit`, `rawHeight`, `area`, `volume`, `recordedAt`, timestamps. Indexed by source and time for history queries.

### `GalleryItem`

`title`, `caption`, `type` (`image | video`), `url`, `thumbnailUrl`, `createdBy`, timestamps.

## Project structure

```text
global_backend/
├── config/db.js              # Mongoose connection + DB-name fallback
├── controllers/
│   ├── authController.js     # register/login/profile/users
│   ├── waterSourceController.js
│   ├── hardwareController.js # readings ingestion + volume math
│   └── galleryController.js
├── middleware/
│   └── authMiddleware.js     # protect, requireGovernment, requireSourceManager
├── models/
│   ├── User.js
│   ├── WaterSource.js
│   ├── WaterReading.js
│   └── GalleryItem.js
├── routes/
│   ├── authRoutes.js
│   ├── waterSourceRoutes.js
│   ├── hardwareRoutes.js
│   └── galleryRoutes.js
├── scripts/seed.js           # optional demo sources
├── .env.example
└── server.js                 # app setup, CORS, route mounting
```

## Deployment notes

- Set `MONGO_URI`, `JWT_SECRET`, `HARDWARE_API_KEY`, and `CLIENT_ORIGIN` in the host's environment.
- Set `CLIENT_ORIGIN` to the deployed frontend URL(s); multiple origins are comma-separated.
- Use a long random `HARDWARE_API_KEY` and rotate it if a device is lost.
- Place the API behind HTTPS when field devices send readings over the internet.
- The JSON body limit is 1 MB; media is linked by URL rather than uploaded.
