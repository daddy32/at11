# Eurovea Venues And Daily Menus

Last checked: 2026-03-25

## Purpose

This document is a working inventory for the future `eurovea` location.

It separates:

- the official Eurovea venue list
- official Eurovea venues for which a daily-menu source was found
- nearby candidates that appear in menu aggregators but were not confirmed on the official Eurovea list
- official Eurovea venues for which no reliable daily-menu feed was found in this pass

## Primary Sources

- Official Eurovea gastro directory: <https://eurovea.sk/gastro>
- Official Eurovea center map: <https://eurovea.sk/mapa-centra>
- Menučka Eurovea aggregate: <https://menucka.sk/denne-menu/bratislava/eurovea-galleria>
- Menučka Eurovea menu-list aggregate: <https://menucka.sk/jedalne-listky/bratislava/eurovea-galleria>
- restauracie.sme.sk Eurovea area aggregate: <https://restauracie.sme.sk/denne-menu/eurovea-pribinova-culenova_3042>

## High-Level Notes

- Eurovea is the source of truth for "is this venue in the target location?"
- Daily menus are mostly published on third-party portals, not on Eurovea itself.
- The official Eurovea gastro page currently says the biggest concentration of venues is in `Foodcourt E2` and on the promenade.
- The official Eurovea gastro page currently says `Bageterie Boulevard` is closed.
- Menučka and restauracie.sme.sk area pages include some nearby venues, not only venues physically inside Eurovea.

## Official Eurovea Venues With A Discoverable Daily-Menu Feed

| Venue | Official Eurovea list | Daily-menu source | Parser candidate | Notes |
| --- | --- | --- | --- | --- |
| DOCK7 | Yes | <https://menucka.sk/dock7> | Yes | Strong candidate. Dedicated Menučka page exposes structured daily menu text and a standard menu page. |
| COMO | Yes | <https://menucka.sk/denne-menu/bratislava/como-eurovea-2> | Yes | Good candidate. Dedicated Menučka daily-menu page exists, but some snapshots say `V tieto dni sa denné menu nepodáva`. |
| PaB DONAU | Yes | <https://menucka.sk/denne-menu/bratislava/pab-donau> | Maybe | Candidate exists, but the latest searchable snapshot emphasized opening-info text more than daily dishes. Needs manual spot-check before parser work. |
| Kolkovna Eurovea restaurant | Yes | <https://restauracie.sme.sk/restauracia/kolkovna-eurovea_4138-stare-mesto_2949/denne-menu> | Yes | Good candidate. Also appears with current dish items on the Eurovea-area aggregate page. |
| Brasserie La Marine | Yes | <https://restauracie.sme.sk/restauracia/brasserie-la-marine_3850-stare-mesto_2949/denne-menu> | Maybe | Eurovea-area aggregate page shows dish items. Dedicated page exists, but the searchable snapshot is thinner than Kolkovna's. |
| Primi Eurovea | Yes | <https://restauracie.sme.sk/restauracia/primi-river-lounge-eurovea_3831-stare-mesto_2949/denne-menu> | Low | Dedicated page exists, but the visible searchable content mostly points to nearby restaurants rather than a clean Primi daily menu. Needs manual confirmation. |

## Nearby Candidates Not Confirmed On The Official Eurovea List

These should not be added to the `eurovea` config by default unless you decide the app should cover the broader office walking radius, not just the Eurovea complex.

| Venue | Official Eurovea list | Daily-menu source | Parser candidate | Notes |
| --- | --- | --- | --- | --- |
| ENFES Mediterian - Eurovea 2 | No | <https://menucka.sk/denne-menu/bratislava/enfes-mediterian-eurovea-2> | Maybe | Menučka page explicitly says it offers `denné obedové menu`, but I did not confirm it on the official Eurovea list. |
| Umelka | No | <https://menucka.sk/denne-menu/bratislava/eurovea-galleria> | Maybe | Shows up on Eurovea-area aggregators, but it is clearly a nearby venue rather than an official Eurovea unit. |
| G4 bistro | No | <https://restauracie.sme.sk/denne-menu/eurovea-pribinova-culenova_3042> | Maybe | Nearby-area listing, not confirmed on the official Eurovea directory. |
| HEPPiApple restaurant | No | <https://restauracie.sme.sk/denne-menu/eurovea-pribinova-culenova_3042> | Maybe | Same issue as G4 bistro: nearby-area listing, not confirmed as an official Eurovea venue. |

## Official Eurovea Venues Found, But No Reliable Daily-Menu Feed Located In This Pass

This is not a claim that no daily menu exists. It only means no reliable feed was located quickly enough for parser planning.

| Venue | Official source | Current status for parser planning | Notes |
| --- | --- | --- | --- |
| wagamama | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official Eurovea listing found; no reliable lunch-menu feed located in this pass. |
| Sajado | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official Eurovea listing found; likely standard menu first. |
| Ram's | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official Eurovea listing found; no clean daily-menu feed located in this pass. |
| Mondieu | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official venue pages exist, but no obvious daily-lunch feed was found. |
| Seoul Korean Bistro | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official listing found; no structured daily-menu source located in this pass. |
| Satyam | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official listing found; no reliable lunch feed located in this pass. |
| Poké bistro | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official listing found; no daily-menu feed located in this pass. |
| Osaka running sushi | <https://eurovea.sk/gastro> | No daily-menu feed found yet | Official listing found; no reliable lunch feed located in this pass. |
| Regal Burger | <https://eurovea.sk/gastro> | Static menu found, daily menu not confirmed | Menučka exposes a standard menu page, but I did not confirm a reliable daily-lunch feed. |
| McDonald's | <https://eurovea.sk/gastro> | Not a realistic daily-menu target | Official listing found, but this is not a practical daily-menu parser target. |
| KFC | <https://eurovea.sk/gastro> | Not a realistic daily-menu target | Same reasoning as McDonald's. |
| Starbucks | <https://eurovea.sk/gastro> | Not a realistic daily-menu target | Coffee-chain profile, not a lunch-menu parser target. |

## Best Initial Parser Candidates

If the goal is to start small and keep maintenance reasonable, these look like the best first parser targets:

1. DOCK7
2. COMO
3. Kolkovna Eurovea restaurant
4. PaB DONAU

Brasserie La Marine is also plausible, but I would validate its page structure first.

## Suggested Next Step

Before any Eurovea parser implementation starts, manually confirm these four items in a browser on the same day:

1. The venue is still listed on the official Eurovea gastro page.
2. The menu source still exposes current lunch content without login or heavy client-side rendering.
3. The page structure is stable enough for parsing.
4. The venue is close enough to the office to belong in the actual product scope.
