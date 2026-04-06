# RTK Racket Circle — Tech Stack

## Overblik

RTK Racket Circle er en cross-platform app (web, iOS, Android) bygget med React Native/Expo. Appen fungerer som netværksplatform for medlemmer af Roskilde Tennis Klubs erhvervsnetværk med funktioner til events, kampe, beskeder og medlemsoversigt.

**Live URL:** https://app.racketcircle.dk (GitHub Pages)
**Backend:** Supabase (PostgreSQL + Auth + Realtime + RPC)
**Supabase projekt:** `wssjhnjuhfvbehotjnlz` (free tier — kræver daglig ping for at undgå sleep)

---

## Framework & Runtime

| Teknologi | Version | Formål |
|---|---|---|
| **Expo SDK** | 54 | Cross-platform framework der bygger til web, iOS og Android fra én codebase. Håndterer build, bundling og native moduler. |
| **React Native** | 0.81 | UI-framework der renderer native komponenter på mobil og DOM-elementer på web. |
| **React** | 19.1 | Komponent-model og state management med hooks. |
| **React Native Web** | 0.21 | Oversætter React Native-komponenter til HTML/CSS så samme kode kører i browseren. |
| **TypeScript** | 5.9 | Statisk typning af hele codebasen. Strict mode aktiveret. Fanger fejl ved compile-time. |

---

## Navigation & Routing

| Teknologi | Formål |
|---|---|
| **Expo Router** 6 | Filbaseret routing — filstrukturen i `app/` definerer URL-strukturen. Understøtter typed routes for typesikre links. |
| **React Navigation** 7 | Underliggende navigationsbibliotek. Bottom tabs, stack navigation og deep linking. |

**Flow:** `app/_layout.tsx` checker login-status → uautoriserede brugere redirectes til `app/login.tsx` → autoriserede brugere ser tab-navigation med Hjem, Medlemmer, Begivenheder & Kampe, Beskeder, Om os, Profil.

**Tab-reset:** Ved tryk på en tab-knap nulstilles den aktive tabs stack til roden via `router.replace()`. Gælder alle tabs.

---

## UI & Design

| Teknologi | Formål |
|---|---|
| **React Native Paper** 5.15 | Material Design 3 komponentbibliotek. Leverer buttons, cards, dialogs, text inputs, checkboxes, FAB mm. med konsistent styling. |
| **Material Community Icons** | Ikonbibliotek med 6000+ ikoner brugt i navigation, kort og knapper. |
| **Custom theme** (`theme/`) | Centraliseret farvepalette og roundness (12px). Alle komponenter trækker farver fra `colors.ts`. |

---

## Backend — Supabase

| Komponent | Formål |
|---|---|
| **PostgreSQL database** | Relationel database med tabeller for profiles, events, event_participants, matches, match_participants, conversations, conversation_participants, messages. |
| **Supabase Auth** | Email/password-autentifikation. Håndterer session tokens, password reset og token refresh. Sessions persisteres via AsyncStorage. |
| **Row Level Security (RLS)** | Database-niveau adgangskontrol. Policies SKAL inkludere `TO anon, authenticated` for at virke med Supabase Auth. Defineret i `supabase/rls-policies.sql`. |
| **Realtime** | WebSocket-subscriptions på events, matches og deltagertabeller. Appen opdaterer automatisk når andre brugere foretager ændringer. |
| **RPC (Remote Procedure Calls)** | Server-side funktioner: `send_email_via_resend` (email afsendelse), `cleanup_old_matches` (automatisk sletning), `update_match_status` (statusopdatering), `update_auth_password` (admin password reset). |

**Database-skema** er dokumenteret i `supabase/migration.sql`.

---

## State Management

Appen bruger **React Context** til global state. Hver context wrapper hele app-træet og eksponerer data + handlinger via hooks:

| Context | Fil | Formål |
|---|---|---|
| **AuthContext** | `contexts/AuthContext.tsx` | Login/logout, current user, profilopdatering, password management. Mapper mellem Supabase snake_case (`ProfileRow`) og app camelCase (`Member`). |
| **EventsContext** | `contexts/EventsContext.tsx` | CRUD for events, til/framelding, status-beregning (upcoming/ongoing/completed). Sender notifikationer ved oprettelse og aflysning. |
| **MatchesContext** | `contexts/MatchesContext.tsx` | CRUD for kampe, deltager-toggle, auto-completion efter kampdagen, server-side cleanup af gamle kampe via RPC. |
| **MembersContext** | `contexts/MembersContext.tsx` | Medlemsliste, profilopdateringer (admin). Deler `profileMapper.ts` med AuthContext. |
| **MessagesContext** | `contexts/MessagesContext.tsx` | Samtaler, beskeder, ulæst-tæller. Realtime-subscription for live chat. |

**Mønster:** Optimistic updates → Supabase call → revert ved fejl. Giver hurtig UI-respons.

---

## Email-notifikationer

| Fil | Formål |
|---|---|
| `lib/notifications.ts` | Seks notifikationsfunktioner der sender emails via Supabase RPC → Resend. |

**De fire notifikationskategorier (brugervalg i Rediger Profil):**

| Kategori | Flag i DB | Funktioner |
|---|---|---|
| Nye events | `notification_new_event` | `notifyNewEvent` — alle aktive medlemmer der har opted in |
| Nye kampe | `notification_new_match` | `notifyNewMatch` — filtreret på sport, format og niveau |
| Aflysninger og ændringer | `notification_event_update` | `notifyEventCancelled`, `notifyMatchCancelled`, `notifyMatchFull` |
| Nye beskeder | `notification_new_message` | `notifyNewMessage` — kun modtageren |

**Sikkerhed:** Alle bruger-input i emails escapes med `escapeHtml()` for at forhindre XSS.

---

## Build & Deployment

**Krav:** Node.js via NVM — kør først:
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

| Trin | Kommando / Fil | Formål |
|---|---|---|
| **Web build** | `npx expo export --platform web` | Bundler appen til statiske filer i `dist/`. React Compiler optimerer bundle. |
| **Post-export** | `node scripts/post-export.js` | Genererer service worker (`sw.js`), `404.html` for SPA-routing, kopierer `CNAME` for custom domain. |
| **Deploy** | `npx gh-pages -d dist` | Pusher `dist/` til `gh-pages` branch → GitHub Pages serverer den. |
| **Custom domain** | `public/CNAME` | DNS CNAME peger `app.racketcircle.dk` → GitHub Pages. HTTPS via Let's Encrypt. |

**Fuld deploy i én linje:**
```bash
npx expo export --platform web && node scripts/post-export.js && npx gh-pages -d dist
```

**Service worker:** Network-first strategi for HTML, cache-first for hashede assets. Poller hvert 60. sekund for opdateringer og prompter brugeren til reload.

---

## Data & Persistens

| Teknologi | Formål |
|---|---|
| **AsyncStorage** | Lokal persistens af auth-session og credentials så brugeren forbliver logget ind efter app-genstart. |
| **Supabase PostgreSQL** | Primær datakilde. Al data synkroniseres via Supabase client library med automatisk token refresh. |

---

## Hjælpebiblioteker

| Bibliotek | Formål |
|---|---|
| **date-fns** 4.1 | Dato-formatering og manipulation (dansk locale). Bruges til visning af event- og kampdatoer. |
| **expo-image** | Optimeret billedvisning med caching. Brugt til avatars og event-billeder. |
| **expo-image-picker** | Kameraadgang og billedvalg til profilbilleder. |
| **@react-native-community/datetimepicker** | Native dato/tid-vælger i formularer (event- og kampoprettelse). |
| **react-native-reanimated** | Performant animationer der kører på native thread. |
| **react-native-gesture-handler** | Touch-gestures (swipe, long press) til navigation og interaktion. |

---

## Utilities

| Fil | Formål |
|---|---|
| `utils/profileMapper.ts` | Konverterer `Member` (camelCase) til `ProfileRow` (snake_case) for Supabase. Delt mellem AuthContext og MembersContext. |
| `utils/formatters.ts` | Dato- og tekstformatering til UI-visning. |
| `utils/search.ts` | Søgefunktion til medlemsoversigt — filtrerer på navn, firma, branche mm. |
| `lib/supabase.ts` | Supabase client-instans med konfiguration for auth, storage og URL-detection. |

---

## CI/CD & Vedligehold

| Komponent | Formål |
|---|---|
| `.github/workflows/keep-supabase-alive.yml` | GitHub Action der pinger Supabase REST API dagligt kl. 09:13 dansk tid. Forhindrer cold starts på free tier. **Vigtigt:** Supabase free tier pauser databasen efter 7 dages inaktivitet — denne ping holder den i live. Kræver `SUPABASE_URL` og `SUPABASE_ANON_KEY` som GitHub Secrets. |
| **ESLint** 9.25 + expo-config | Code linting. Kører via `npm run lint`. |

---

## Mappestruktur

```
├── app/                    # Screens & routing (Expo Router)
│   ├── _layout.tsx         # Root layout med auth-gate
│   ├── login.tsx           # Login-skærm
│   ├── forgot-password.tsx # Password reset
│   └── (tabs)/             # Tab-navigation
│       ├── index.tsx       # Hjem
│       ├── events/         # Events (liste, detaljer, opret)
│       ├── matches/        # Kampe (liste, detaljer, opret)
│       ├── messages/       # Beskeder (samtaler, chat)
│       ├── directory/      # Medlemsoversigt
│       ├── profile/        # Profil & indstillinger
│       └── about/          # Om appen
├── components/             # Genbrugelige UI-komponenter
├── contexts/               # React Context providers (state)
├── lib/                    # Supabase client & notifications
├── utils/                  # Hjælpefunktioner
├── types/                  # TypeScript type-definitioner
├── theme/                  # Farver & Material Design 3 tema
├── data/                   # Statisk data (kategorier, guides)
├── supabase/               # Migration SQL & RLS policies
├── scripts/                # Build-scripts (post-export)
├── public/                 # Statiske web-assets (CNAME)
└── assets/                 # Billeder (ikon, splash, baggrund)
```

---

## Billedhåndtering

| Type | Opløsning | Format | Lagring |
|---|---|---|---|
| **Profilavatar** | Originalt billede, 1:1 crop, 50% kvalitet | JPEG base64 | `avatar_url` i profiles (TEXT) |
| **Familiebilleder** | 600×600 px, center-crop, 80% kvalitet | JPEG base64 data URL | `family_photos` i profiles (JSONB array, maks 3 stk.) |

**Upload-metode (web):** Native `<input type="file">` + canvas resize. Expo-image-picker bruges kun til profilavatar.

**Lightbox:** Tryk på avatar eller familiebillede åbner billedet i fuld størrelse i en mørk modal (`ImageLightbox`-komponent).

---

## Tidszoner

**Vigtigt:** Alle dato/tid-felter i Supabase er `TIMESTAMPTZ` (UTC). Appen konverterer lokal tid til UTC via `new Date(localString).toISOString()` før INSERT. Ved visning konverteres UTC tilbage til lokal tid via `new Date(utcString).toTimeString()`.

Fejl at undgå: Send aldrig dato-strenge uden timezone-info til Supabase (f.eks. `"2026-04-10T18:00:00"` uden `Z` eller offset) — PostgreSQL tolker dem som UTC, ikke lokal tid.

---

## Nøglebeslutninger

1. **Expo over bare React Native** — forenkler build, OTA-updates og web-support uden native toolchains.
2. **Supabase over custom backend** — Auth, database, realtime og RPC i én hosted service. Intet server-vedligehold.
3. **React Context over Redux/Zustand** — tilstrækkeligt til appens kompleksitet, ingen ekstra dependencies.
4. **GitHub Pages over Vercel/Netlify** — gratis hosting, simpel deploy via `gh-pages` CLI, custom domain med SSL.
5. **Service Worker** — offline-resilience og automatisk cache-busting ved nye deploys.
6. **RLS over client-side auth checks** — sikkerhed håndh��ves i databasen, ikke kun i UI-koden. Policies skal eksplicit angive `TO anon, authenticated`.
7. **Optimistic updates** — UI opdaterer øjeblikkeligt og reverter kun ved server-fejl. Giver bedre brugeroplevelse.
8. **Base64-billeder i JSONB over Supabase Storage** — familiebilleder gemmes som canvas-resizede data URLs direkte i profil-JSONB. Undgår kompleks Storage-opsætning og RLS-problemer. Filstørrelse holdes lav (5-30KB per billede) via resize + kompression.
9. **Dato-konvertering til UTC** — al dato/tid konverteres til ISO UTC-strenge (`toISOString()`) før de sendes til Supabase, for at undgå timezone-forskydninger.

---

## Kendte begrænsninger & gotchas

1. **Supabase free tier sleep** — databasen pauser efter 7 dages inaktivitet. GitHub Action pinger dagligt for at forhindre dette.
2. **RLS policies skal angive roller** — `CREATE POLICY ... TO anon, authenticated` — ellers virker de ikke med Supabase Auth.
3. **Service worker caching** — efter deploy kan brugere se gammel version i op til 60 sekunder. Hard refresh (Ctrl+Shift+R) tvinger opdatering.
4. **Familiebilleder kan ikke opdateres individuelt** — hele arrayet overskrives ved ændring. Maks 3 billeder.
5. **Web-only billedupload** — family photo canvas-resize bruger browser DOM (`document.createElement('canvas')`). Virker kun på web, ikke native iOS/Android.
6. **Expo-image-picker på web** — returnerer ikke base64 pålideligt. Derfor bruges native `<input type="file">` til familiebilleder.
