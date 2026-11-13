# The Wilson Water Pirates 🛶💦

A cheerful, wholesome canoe-splashing game for Alex (6) and Zoe (4). Float down a Michigan river with Dad steering in the back, Zoe in the middle and Alex up front. Squirt ducks, paddlers, tubers, frogs, a friendly bear, fish, a grumpy beaver and a rival pirate raft; scoop up coins, rubber duckies, popsicles and s'mores; and watch Dad save the day when the canoe bumps a big rock (instant replay on SPLASH CAM!).

- Drag (or tap below the canoe) to steer. Tap anywhere above to squirt.
- Big button bottom-left switches shooter: Alex = super soaker 💦, Zoe = water balloon 🎈 (big splash).
- Intro card for each river section. Life jackets refill on their own; no game over. ~2.5 minute run: Sunny Stream → Duck Pond Bend → Beaver Rapids → Sunset Camp.
- Optional tilt steering (📱 on the title screen; asks motion permission on iPhone).
- Original WebAudio pirate-jig music (ukulele, glockenspiel, kazoo), cheerful voice lines.

Play: https://howibrettyourmother.github.io/wilson-water-pirates/

## Per-kid saves (v1.4, Nov 2026)
Best score, Normal/Hard and badges are saved per kid (`wwp_alex_*`, `wwp_zoe_*`) using `?kid=` from the hubs (or the last kid who played). Old per-device saves were copied to Alex once, so Zoe no longer inherits Alex's Hard mode. Hat colors stay shared because both kids ride in the canoe.

## iPad landscape (v1.5, Nov 2026)
In landscape the river widens (up to 1.5×) to fill the screen, with a bit more to splash so it never feels empty. The title screen gets a landscape layout: hat pickers on the left, the canoe in the middle, and GO, Normal/Hard and best score on the right, so nothing overlaps. Shorter portrait screens use a compact layout that keeps the GO button clear of the hat rows.

## Together mode (Nov 2026)
Tap **👫 Together** on the title (or open `?mode=together`). Alex steers and squirts as usual;
Zoe gets her own big pink 🎈 button in the bottom-right corner that auto-aims a water balloon
at the nearest target (it pulses if she hasn't tapped for a while). The end screen shows each
kid's splashes, and the team keeps its own best score (`wwp_team_best`), separate from each kid's.
Uses the vendored shared kids lib (`src/kids.js`, from github.com/howibrettyourmother/kids-lib).
