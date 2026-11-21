# Trenul lui Bubu

A browser game for children (5th grade): Bubu, a plush ladybug, travels by
train from Timișoara to Putna on Christmas Eve and completes missions along
the way.

The game runs entirely in the browser (laptop, tablet and phone) and is
published with GitHub Pages. It uses plain HTML, CSS and JavaScript modules,
with no libraries and no build step.

## Structure

```
index.html       entry page (redirects to the winter journey for now)
shared/          code and assets shared by every season of the game
winter/          the Christmas journey
```

A future summer journey will live in `summer/` and reuse `shared/`.

## Playing

The journey has four chapters, which unlock one after another. Progress is
saved in the browser after every station (no accounts, nothing leaves the
device), so it can be continued another day with “Continuă călătoria”.
Finished chapters can be replayed for more stars.

The teacher can open every chapter with `?profesor`, e.g.
`winter/?profesor`.

## Running locally

The game uses JavaScript modules, so it must be served over HTTP (opening
`index.html` directly from disk does not work):

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/winter/>.

To try it on a phone or tablet in the same Wi-Fi network, start the server
with `--bind 0.0.0.0` and open `http://<computer IP>:8000/winter/` on the
device.

### Testing helpers

URL parameters that make testing faster (the first four skip the menu and
do not save anything):

| Parameter        | Effect                                                    |
|------------------|-----------------------------------------------------------|
| `?skip`          | skip Bubu's introduction                                  |
| `?from=<id>`     | start at a station, e.g. `?from=ilva-mica`                |
| `?speed=<n>`     | run the journey `n` times faster, e.g. `?speed=4`         |
| `?at=<seconds>`  | skip the intro and the first mission, fast-forward        |
| `?debug`         | expose the game objects as `window.trenulDebug`           |

They can be combined: `?from=ilva-mica&speed=3` shows the viaducts quickly.
Station ids are listed in `winter/js/route-data.js`.

## Code overview

```
shared/js/core/      stage (resolution-independent canvas), loop, cache, math
shared/js/gfx/       colours, drawing primitives, time-of-day tinting
shared/js/world/     sky, lighting, landscape (biomes), railway, features, snow
shared/js/train/     train compositions, car painters, Bubu
shared/js/journey/   route model, motion planning, journey state machine
shared/js/game/      player state (name, stars, ornaments)
shared/js/missions/  mission base class, director and mission types
shared/js/ui/        HUD, mission HUD and overlays
winter/js/           winter route, winter missions and entry point
```
