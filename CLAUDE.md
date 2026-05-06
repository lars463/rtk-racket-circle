# RTK Racket Circle — Claude Code Projektguide

## Hvad er dette?
En React Native/Expo klub-app for Roskilde Tennis Klubs erhvervsnetværk "RTK Racket Circle". Appen er live på **https://app.racketcircle.dk** (GitHub Pages).

## Vigtig dokumentation — LÆS FØRST
- **`TECH-STACK.md`** — Komplet teknisk opsætning: framework, Supabase, deploy, billedhåndtering, tidszoner, nøglebeslutninger, kendte begrænsninger.
- **`PROCESSER.md`** — Al forretningslogik: event/kamp-livscyklus, login, beskeder, notifikationer, RLS, vedligehold, fejlhåndtering og lærdomme.

Læs begge filer ved sessionens start hvis du skal arbejde med appen.

## Hurtig-opsætning

### Start dev server
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
npx expo start --web
```

### Deploy til produktion
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
npx expo export --platform web && node scripts/post-export.js && npx gh-pages -d dist
```

### TypeScript check
```bash
npx tsc --noEmit
```

## Nøglefakta

| | |
|---|---|
| **Framework** | Expo SDK 54, React Native 0.81, TypeScript 5.9 |
| **UI** | React Native Paper 5.15 (Material Design 3) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + RPC) |
| **Supabase URL** | `https://wssjhnjuhfvbehotjnlz.supabase.co` |
| **Deploy** | GitHub Pages via `gh-pages` CLI |
| **GitHub repo** | `https://github.com/lars463/rtk-racket-circle` |
| **Sprog i UI** | Dansk |

## Kritiske regler (SKAL følges)

1. **RLS policies** SKAL inkludere `TO anon, authenticated` — ellers virker de ikke med Supabase Auth.
2. **Datoer** SKAL konverteres til UTC via `new Date(localString).toISOString()` før INSERT til Supabase TIMESTAMPTZ-kolonner.
3. **Nye database-kolonner** kræver ændring 5 steder: SQL Editor → `types/database.ts` → relevant context → `utils/profileMapper.ts` (hvis profiles) → `supabase/migration.sql`.
4. **Supabase INSERT/UPDATE** — destrukturér ALTID `{ data, error }` og håndtér `error` eksplicit. Vis fejl til bruger via `alert()`.
5. **Billedupload (web)** — brug `<label>` med skjult `<input type="file">` (IKKE programmatisk `input.click()` — blokeres af iOS Safari).
6. **Commit + push** efter hver session — det er backup.

## Mappestruktur (hovedfiler)
```
app/                    → Screens & routing (Expo Router, filbaseret)
  _layout.tsx           → Root layout med auth-gate
  login.tsx             → Login-skærm
  (tabs)/               → Tab-navigation (Hjem, Medlemmer, Aktivitet, Beskeder, Om os, Profil)
                          Aktivitet samler kampe og begivenheder (kampe vises først).
components/             → Genbrugelige UI-komponenter
contexts/               → React Context providers (Auth, Events, Matches, Members, Messages)
lib/supabase.ts         → Supabase client
lib/notifications.ts    → Email-notifikationer (6 funktioner)
types/                  → TypeScript interfaces + database row types
utils/                  → Formatters, search, profileMapper
supabase/migration.sql  → Database-skema reference
Master data from admin/ → Lokal admin-data (kan synces til Supabase)
```

## Supabase login (test)
- **Email:** `lbrus@outlook.com`
- **Password:** `rtk2026`
- **Rolle:** Admin

## Notifikationssystem
4 kategorier med brugervalg. Emails sendes via Supabase RPC → Resend.
- `notification_new_event` — nye events (undtagen opretter)
- `notification_new_match` — nye kampe + kamp fuld + kamp aflyst
- `notification_event_update` — event aflyst
- `notification_new_message` — nye beskeder

## Kendte begrænsninger
- Supabase free tier pauser efter 7 dage → GitHub Action pinger dagligt
- Service worker kan cache gammel version i op til 60 sek. efter deploy
- Familiebilleder: maks 3, base64 i JSONB, 600×600 JPEG 0.8
- `expo-image-picker` returnerer ikke base64 pålideligt på web → brug native `<input type="file">`
- React Compiler-cache kan korruptere enkelte UTF-8 strenge i bundle (mojibake). Hvis det opstår: `rm -rf .expo dist && npx expo export --platform web --clear`
