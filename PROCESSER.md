# RTK Racket Circle — Processer & Forretningslogik

## 1. Event-livscyklus

### Oprettelse
1. Admin/medlem udfylder formular: titel, beskrivelse, kategori, dato, start/sluttid, lokation, max deltagere, tilmeldingsfrist.
2. Event oprettes i `events`-tabellen. Opretteren tilføjes automatisk som deltager.
3. Email-notifikation sendes til alle aktive medlemmer med **"Nye events"** slået til.

### Tidszoner ved oprettelse
- Bruger vælger dato og tid i lokal tid (dansk tid).
- Appen konverterer til UTC via `new Date(localString).toISOString()` før INSERT til Supabase.
- Alle `TIMESTAMPTZ`-felter i databasen er i UTC.
- Ved visning konverteres UTC tilbage til lokal tid.

### Tilmeldingsfrist (valgfrit)
- Opretter kan sætte en frist-dato og frist-tid.
- Gemmes i `events.registration_deadline` (TIMESTAMPTZ).
- Konverteres til UTC på samme måde som event-dato.

### Statusberegning (hvert 60. sekund)
| Status | Betingelse |
|---|---|
| **Kommende** (`upcoming`) | Startdato ligger i fremtiden |
| **I gang** (`ongoing`) | Startdato er passeret, men slutdato ligger stadig i fremtiden |
| **Afsluttet** (`completed`) | Slutdato er passeret — eller startdato er passeret hvis ingen slutdato er sat |

### Til/framelding
- Medlemmer kan melde sig til/fra via toggle-knap.
- Optimistic update: UI opdaterer straks, reverterer ved serverfejl.
- Max deltagere håndhæves: tilmelding blokeres når `attendeeIds.length >= maxAttendees` (både i UI og context).

### Sletning
- Kun opretter eller admin kan slette et event.
- Ved sletning: email-notifikation sendes til alle tilmeldte med **"Aflysninger og ændringer"** slået til.
- Cascade delete fjerner alle deltagerregistreringer.

### Levetid
- **Events slettes aldrig automatisk.** Afsluttede events forbliver i databasen og vises under "Tidligere".

---

## 2. Kamp-livscyklus

### Oprettelse
1. Medlem udfylder formular: sport (tennis/padel), format, niveau-interval, dato, start/sluttid, lokation, beskrivelse.
2. **Format-muligheder per sport:**
   - Tennis: Single (2 spillere), Single mix (2), Double (4), Mixdouble (4)
   - Padel: Double (4), Mixdouble (4) — ingen singles i padel
3. `maxPlayers` sættes automatisk: 2 for singles/singles_mix, 4 for doubles/mixed.
4. Kamp oprettes i `matches`-tabellen. Opretteren tilføjes automatisk som deltager.
5. Email-notifikation sendes til relevante medlemmer (se filtreringslogik nedenfor).

### Notifikations-filtrering ved ny kamp
Kun medlemmer der opfylder **alle** kriterier modtager email:
- Har **"Nye kampe"** slået til i notifikationsindstillinger.
- Har relevant interesse markeret i `matchInterests` (6 felter):
  - Padel double (samme køn) → `padelDouble = true`
  - Padel mixdouble → `padelMix = true`
  - Tennis single (samme køn) → `tennisSingle = true`
  - Tennis single (mix) → `tennisSingleMix = true`
  - Tennis double (samme køn) → `tennisDouble = true`
  - Tennis mixdouble → `tennisMix = true`
- Har et niveau inden for kampens interval:
  - Tennis → `playLevel >= levelMin && playLevel <= levelMax`
  - Padel → `padelLevel >= levelMin && padelLevel <= levelMax`

### Kønsbaseret filtrering ved "samme køn"-formater
For formater markeret som "samme køn" (`singles` og `doubles`) gælder yderligere:
- Kun medlemmer med **samme køn** som kampens opretter modtager notifikation.
- Hvis opretter eller medlem ikke har angivet køn, springes filtreringen over (alle modtager).
- "Mix"-formater (`singles_mix`, `mixed`) sender til alle uanset køn.

### Status-overgange
| Status | Betingelse |
|---|---|
| **Åben** (`open`) | Antal spillere < max spillere |
| **Fuld** (`full`) | Antal spillere >= max spillere → email til alle deltagere (hvis "Aflysninger og ændringer" er slået til) |
| **Afsluttet** (`completed`) | Kampdatoen er passeret (automatisk, tjekkes hvert 60. sekund) |

### Datologik for auto-completion
- Sammenligning sker på **dags-niveau**, ikke tidspunkt.
- En kamp d. 7. april forbliver synlig hele d. 7. april.
- D. 8. april kl. 00:00 skifter status til `completed`.
- Beregning: `matchDay < todayStart` (begge sat til midnat).

### Automatisk sletning
- Kampe ældre end **2 dage** slettes automatisk.
- Beregning: `todayStart - matchDay > 172.800.000 ms` (2 × 24 × 60 × 60 × 1000).
- Sletning sker server-side via RPC `cleanup_old_matches()` (SECURITY DEFINER, bypasser RLS).
- SQL: `DELETE FROM matches WHERE date::date < (CURRENT_DATE - INTERVAL '2 days')`.
- RPC kaldes maks én gang per bruger-session (flag `cleanupDone`).

### Deltagelse
- **Tilmelding:** INSERT i `match_participants` + status opdateres via RPC `update_match_status`.
- **Framelding:** DELETE fra `match_participants` + status opdateres.
- **Opretter kan ikke forlade** sin egen kamp.
- **Fuld kamp:** Tilmelding blokeret hvis `playerIds.length >= maxPlayers`.
- Optimistic update med revert ved fejl.

### Manuel sletning
- Opretter eller admin kan slette en kamp.
- Email-notifikation sendes til alle deltagere med **"Aflysninger og ændringer"** slået til.

### Tidslinje-eksempel
| Dag | Status | Synlig i app |
|---|---|---|
| 7. april (kampdato) | `open` / `full` | Ja, hele dagen |
| 8. april | `completed` | Nej (filtreres fra — kun `open`/`full` vises) |
| 10. april | Slettet | Fjernet fra database |

---

## 3. Login & Autentifikation

### Login
1. Bruger indtaster email + adgangskode.
2. Email normaliseres: `.trim().toLowerCase()`.
3. Supabase Auth verificerer credentials.
4. Profil hentes fra `profiles`-tabellen.
5. Tjek: hvis `is_active = false` → bruger logges ud, login afvises.
6. Session persisteres via AsyncStorage (forbliver logget ind ved genstart).

### Session-genoptagelse ved app-start
1. `supabase.auth.getSession()` tjekker for eksisterende session.
2. Hvis gyldig: hent profil, tjek `is_active`.
3. Hvis ugyldig eller inaktiv: redirect til login-skærm.

### Logout
1. `currentUser` sættes til `null`.
2. `supabase.auth.signOut()` rydder session.
3. Bruger redirectes til login-skærm.

### Glemt adgangskode
1. Bruger indtaster email på "Glemt adgangskode"-skærm.
2. Supabase sender reset-email (lykkes altid — afslører ikke om email eksisterer).
3. Link i email peger på `https://app.racketcircle.dk/`.
4. Ved klik: `PASSWORD_RECOVERY` event fires → redirect til nulstillings-skærm.
5. Bruger indtaster ny adgangskode (min. 8 tegn).
6. Password opdateres → bruger logges ud → skal logge ind med ny kode.

### Skift adgangskode (logget ind)
1. Bruger indtaster nuværende + ny adgangskode.
2. Nuværende adgangskode verificeres via re-login.
3. Hvis korrekt: `supabase.auth.updateUser({ password })`.
4. Min. 8 tegn krævet.

### Admin: Nulstil anden brugers adgangskode
1. Admin vælger medlem i oversigten.
2. Indtaster ny adgangskode.
3. RPC `update_auth_password` opdaterer via Supabase Auth admin API.

---

## 4. Beskeder

### Start samtale
1. Bruger vælger modtager fra medlemslisten.
2. RPC `start_conversation` opretter samtale med begge parter som deltagere.
3. Hvis samtale allerede eksisterer mellem parterne, returneres den eksisterende.

### Send besked
1. Bruger skriver besked og trykker send.
2. RPC `send_message` indsætter besked i `messages`-tabellen.
3. Optimistic update: besked vises straks i chat.
4. Samtalens `last_message_text` og `last_message_at` opdateres.
5. Email-notifikation sendes til modtager (hvis **"Nye beskeder"** er slået til).
6. Beskedpreview i email begrænses til 100 tegn.

### Læst-status
- Nye beskeder fra andre er `is_read = false`.
- Ved åbning af samtale: alle ulæste beskeder fra andre markeres som læst.
- Ulæst-badge viser antal **samtaler** med ulæste beskeder (ikke antal beskeder).

### Realtime
- Supabase Realtime-kanal lytter efter nye beskeder (INSERT events).
- Nye beskeder fra andre vises automatisk i åben chat.
- Samtalelisten opdateres med ny seneste besked.

### Sletning
- Bruger kan slette en samtale.
- Cascade delete fjerner alle beskeder og deltagerregistreringer.

---

## 5. Medlemsadministration

### Opret nyt medlem (kun admin)
1. Admin udfylder: fornavn, efternavn, email, adgangskode.
2. Email valideres med regex-format-tjek.
3. RPC `create_member` opretter:
   - Supabase Auth-bruger med email/adgangskode.
   - Profil-record med standardværdier.
4. Bekræftelsesskærm vises med login-oplysninger.
5. Admin kan sende velkomst-email via "Send velkomstmail"-knap.

### Rediger profil
Brugere kan redigere:
- Avatar (billedvalg, 1:1 aspect, komprimeret til 50% kvalitet, gemt som base64)
- Navn, bio, kontaktinfo (email, telefon, website)
- Erhvervsinfo (firma, stilling, branche, beskrivelse)
- Køn: Mand / Kvinde (bruges til kønsfiltrering ved "samme køn"-kampe)
- Spilleniveau: tennis og padel (skala: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5 eller "Ingen")
- Kamp-interesser: 6 checkboxes:
  - Padel double (samme køn), Padel mixdouble
  - Tennis single (samme køn), Tennis single (mix)
  - Tennis double (samme køn), Tennis mixdouble
- Notifikationer: 4 checkboxes (nye events, nye kampe, aflysninger/ændringer, nye beskeder)
- RTK-specifikke felter: familie i RTK, familiebilleder (op til 3 stk.), RTK-kompetencer

### Deaktivér medlem (kun admin)
- Admin sætter `is_active = false` på profilen.
- Deaktiveret bruger logges automatisk ud ved næste session-check.
- Login afvises for inaktive brugere.

### Slet medlem (kun admin)
1. DELETE fra `profiles` (cascade sletter deltagelser, beskeder mm.).
2. RPC `delete_auth_user` fjerner bruger fra Supabase Auth.

---

## 6. Notifikationer — samlet oversigt

### De fire kategorier

| Checkbox i profil | Database-flag | Triggeres af |
|---|---|---|
| **Nye events** | `notification_new_event` | Oprettelse af nyt event |
| **Nye kampe** | `notification_new_match` | Oprettelse af ny kamp (filtreret på sport/niveau) |
| **Aflysninger og ændringer** | `notification_event_update` | Event aflyst, kamp aflyst, kamp fuld |
| **Nye beskeder** | `notification_new_message` | Ny besked i samtale |

### Standardværdier for nye medlemmer
| Flag | Standard |
|---|---|
| `notification_new_message` | `true` |
| `notification_new_event` | `true` |
| `notification_new_match` | `true` |
| `notification_event_update` | `true` |

### Email-format
- Afsender: via Resend (Supabase RPC `send_email_via_resend`)
- Branding: "RTK Racket Circle" header i grøn
- Sprog: Dansk
- Footer: "Du modtager denne email fordi du er medlem af RTK Racket Circle."
- Sikkerhed: Alle bruger-input escapes med `escapeHtml()` (XSS-beskyttelse).

---

## 7. Build & Deploy

### Fuld deploy-proces
```
npx expo export --platform web          # 1. Byg web-bundle til dist/
node scripts/post-export.js             # 2. Generér SW, 404.html, kopiér CNAME
npx gh-pages -d dist                    # 3. Push til gh-pages branch → GitHub Pages
```

### Service Worker (automatisk cache-opdatering)
1. Ved første besøg: service worker registreres fra `/sw.js`.
2. Hvert 60. sekund: browser tjekker for ny version af `sw.js`.
3. Ny build → nyt cache-navn (`rtk-v{timestamp}`) → SW aktiverer.
4. Gamle caches slettes automatisk.
5. `controllerchange` event trigger: siden genindlæses én gang.

### Cache-strategi
| Ressource-type | Strategi |
|---|---|
| HTML / navigation | **Network-first** (hent fra netværk, fald tilbage til cache) |
| Hashede assets (JS/CSS med `.[a-f0-9]{8,}.`) | **Cache-first** (immutable, hentes kun én gang) |
| Alt andet | **Network-first** med cache fallback |

### SPA-routing
- `404.html` er kopi af `index.html` → GitHub Pages serverer appen for alle URL'er.
- Expo Router håndterer routing client-side.

### Custom domain
- `public/CNAME` indeholder `app.racketcircle.dk`.
- DNS: CNAME-record hos Simply.com peger på GitHub Pages.
- SSL: Let's Encrypt certifikat via GitHub Pages.

---

## 8. Automatisk vedligehold

### Supabase keep-alive (GitHub Action)
- **Kører:** Dagligt kl. 09:13 dansk tid.
- **Formål:** Pinger Supabase REST API for at forhindre cold start på free tier.
- **Fil:** `.github/workflows/keep-supabase-alive.yml`
- Kan også trigges manuelt via GitHub Actions UI.

### Match-oprydning
- **Trigger:** Automatisk ved app-brug (maks én gang per bruger-session).
- **Handling:** RPC `cleanup_old_matches()` sletter kampe ældre end 2 dage.
- **Sikkerhed:** SECURITY DEFINER — kører med forhøjede rettigheder for at slette på tværs af brugere.

### Event-status
- **Trigger:** Hvert 60. sekund i EventsContext.
- **Handling:** Genberegner status (upcoming/ongoing/completed) baseret på dato.

### Match-status
- **Trigger:** Hvert 60. sekund i MatchesContext.
- **Handling:** Sætter status til `completed` for kampe hvor datoen er passeret.

---

## 9. Sikkerhed (RLS)

### Row Level Security-politikker
| Tabel | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| **profiles** | Alle autentificerede | Admin | Egen profil + admin | Admin |
| **events** | Alle autentificerede | Autentificerede | Opretter + admin | Opretter + admin |
| **event_participants** | Alle autentificerede | Egen tilmelding | — | Egen framelding |
| **matches** | Alle autentificerede | Autentificerede | Opretter + admin | Opretter + admin |
| **match_participants** | Alle autentificerede | Egen tilmelding | — | Egen framelding |
| **conversations** | Kun deltagere | Autentificerede | Deltagere | Deltagere |
| **messages** | Kun samtale-deltagere | Samtale-deltagere | Afsender (læst-status) | — |

### SECURITY DEFINER RPCs (bypasser RLS)
- `cleanup_old_matches` — slet gamle kampe på tværs af brugere
- `create_member` — opret ny bruger i Auth + profiles
- `delete_auth_user` — fjern bruger fra Auth
- `update_auth_password` — nulstil adgangskode
- `send_email_via_resend` — send email-notifikationer
- `start_conversation` — opret samtale med deltagere
- `send_message` — indsæt besked
- `update_match_status` — opdater kamp-status

---

## 10. Køn & Profildata

### Køn (Gender)
- Valgmuligheder: `male` (Mand), `female` (Kvinde), eller `null` (ikke angivet).
- Gemmes i `profiles.gender` (TEXT).
- **Bruges til:** Filtrering af kamp-notifikationer for "samme køn"-formater (singles, doubles).
- Vises på profil som "Mand" / "Kvinde" / "Ikke angivet".

### Familiebilleder
- Op til **3 billeder** per profil.
- Upload: native `<input type="file">` (web) → canvas resize til **600×600 px** → JPEG 80% kvalitet → data URL.
- Gemmes i `profiles.family_photos` (JSONB array af base64 strings).
- Typisk filstørrelse: 5-30 KB per billede.
- Visning: 80×80 thumbnails i profilvisning. Tryk åbner **ImageLightbox** (fuld størrelse i mørk modal).
- Sletning: Kryds-knap fjerner billede fra array under redigering.

### Profilavatar
- Upload via expo-image-picker (kamera/galleri).
- 1:1 aspect ratio, komprimeret til 50% kvalitet.
- Gemmes som base64 i `profiles.avatar_url` (TEXT).
- Vis: `MemberAvatar`-komponent viser billede eller initialer (med grøn baggrund) som fallback.
- Tryk åbner ImageLightbox (kun hvis avatar er sat).

---

## 11. Supabase-drift & Vedligehold

### Free Tier Begrænsninger
- Database pauses efter **7 dages inaktivitet** (ingen API-kald).
- GitHub Action (`.github/workflows/keep-supabase-alive.yml`) pinger dagligt kl. 09:13 dansk tid.
- Kræver GitHub Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Kan trigges manuelt via GitHub Actions UI.

### Database-ændringer (migration)
- Skemaet er defineret i `supabase/migration.sql` — dette er reference-dokumentation, ikke en live migration.
- Ændringer til live-databasen foretages manuelt via **Supabase SQL Editor** (Dashboard → SQL Editor).
- Ved nye kolonner: tilføj også i `types/database.ts` (TypeScript-typer), relevant context og `profileMapper.ts`.

### RLS Policies
- **Kritisk:** Alle policies SKAL inkludere `TO anon, authenticated` for at virke med Supabase Auth.
- Eksempel: `CREATE POLICY "..." ON events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`
- Uden eksplicit rolle-angivelse virker policies ikke for indloggede brugere.

### Supabase RPC-funktioner (server-side)
Alle RPC-funktioner er oprettet via SQL Editor og kører som `SECURITY DEFINER`:
| Funktion | Formål |
|---|---|
| `send_email_via_resend` | Sender email via Resend API |
| `cleanup_old_matches` | Sletter kampe ældre end 2 dage |
| `update_match_status` | Opdaterer kamp-status (open/full) |
| `update_auth_password` | Admin: nulstil brugers adgangskode |
| `create_member` | Admin: opret ny bruger i Auth + profiles |
| `delete_auth_user` | Admin: fjern bruger fra Auth |
| `start_conversation` | Opret/find samtale mellem to brugere |
| `send_message` | Indsæt besked + opdater samtale |

### Realtime-subscriptions
| Kanal | Tabeller | Events |
|---|---|---|
| `events-realtime` | `events`, `event_participants` | INSERT, UPDATE, DELETE |
| `matches-realtime` | `matches`, `match_participants` | INSERT, UPDATE, DELETE |
| `messages-realtime` | `messages`, `conversations` | INSERT, UPDATE |

---

## 12. Data-konstanter

### Niveau-skala (tennis & padel)
`1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5` eller `null` (ikke angivet)

### Kamp-formater (MatchFormat)
| Værdi | Label | Max spillere |
|---|---|---|
| `singles` | Single | 2 |
| `singles_mix` | Single (mix) | 2 |
| `doubles` | Double | 4 |
| `mixed` | Mixdouble | 4 |

### Kamp-interesser (matchInterests)
| Felt | Label i UI | "Samme køn"-filter |
|---|---|---|
| `padelDouble` | Padel double (samme køn) | Ja |
| `padelMix` | Padel mixdouble | Nej |
| `tennisSingle` | Tennis single (samme køn) | Ja |
| `tennisSingleMix` | Tennis single (mix) | Nej |
| `tennisDouble` | Tennis double (samme køn) | Ja |
| `tennisMix` | Tennis mixdouble | Nej |

### Event-kategorier
`networking, tournament, social, workshop, mixer, charity`

### Medlemskabs-niveauer
`standard, premium, founding`

### Brancher
`finance, legal, technology, marketing, real-estate, healthcare, consulting, hospitality, education, other`

### Tidsintervaller
| Interval | Værdi | Bruges til |
|---|---|---|
| Status-check | 60 sekunder | Event/match status-genberegning |
| SW-polling | 60 sekunder | Service worker update-check |
| Match auto-delete | 2 dage (172.800.000 ms) | Server-side cleanup af gamle kampe |
| Keep-alive | 1 gang dagligt (09:13) | Supabase cold start prevention |

---

## 13. Fejlhåndtering & Lærdomme

### Vigtige patterns
- **Supabase INSERT fejl:** Altid destrukturér `{ data, error }` og vis fejlbesked til bruger via `alert()`. Stille fejl (kun `console.error`) gør debugging umuligt.
- **Nye kolonner:** Når en ny kolonne tilføjes til en tabel, SKAL den:
  1. Tilføjes i live-databasen via SQL Editor (`ALTER TABLE ... ADD COLUMN`)
  2. Tilføjes i `types/database.ts` (TypeScript row-type)
  3. Tilføjes i relevant context (mapping fra row til domain-type)
  4. Tilføjes i `utils/profileMapper.ts` (hvis profiles-tabel)
  5. Tilføjes i `supabase/migration.sql` (reference-dokumentation)
- **RLS ved nye tabeller/kolonner:** Test altid at INSERT/SELECT virker med en autentificeret bruger. `service_role`-key bypasser RLS og kan give falsk tryghed.
- **Cache efter deploy:** Service worker opdaterer automatisk inden for 60 sekunder, men brugere kan opleve gammel version. Informér om hard refresh (Ctrl+Shift+R) ved kritiske fejlrettelser.

### Kendte faldgruber
| Problem | Årsag | Løsning |
|---|---|---|
| INSERT fejler stille | Manglende kolonne i database | Tilføj kolonne via SQL Editor |
| Events/kampe forsvinder | Dato uden timezone → tolkes som UTC | Brug `new Date(local).toISOString()` |
| RLS blokerer INSERT | Policy mangler `TO authenticated` | Genskab policy med `TO anon, authenticated` |
| Billeder grynede | For lav canvas-opløsning | Minimum 600×600 for forstørrelse |
| Profil tom efter deploy | Gammel service worker cache | Hard refresh (Ctrl+Shift+R) |
| expo-image-picker fejler på web | Base64 ikke returneret pålideligt | Brug native `<input type="file">` + canvas |
