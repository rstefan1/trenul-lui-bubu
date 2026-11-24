# Trenul lui Bubu

A browser game for children: Bubu, a plush ladybug, travels by
train across Romania and completes missions at the stations and along the
way. Each journey is a route of its own, with its own stations, landscapes
and missions.

The game runs entirely in the browser (laptop, tablet and phone) and is
published with GitHub Pages. It uses plain HTML, CSS and JavaScript modules,
with no libraries and no build step.

## Structure

```
index.html       home page: the list of journeys
home/            the home page's script and style, and the list of journeys (routes.js)
shared/          code and assets shared by every journey of the game
route-01/        the first journey (winter: Timișoara → Putna)
route-02/        the second journey (winter, by day: Putna → Vișeu de Jos, freight train)
route-03/        the third journey (New Year's Eve: Vișeu de Sus → Paltin, on the forest railway)
```

Every new journey gets a folder of its own (`route-02/`, `route-03/`, …),
reuses `shared/`, and is added to `home/routes.js` with its season (winter,
spring, summer or autumn), which gives it its picture on the home page.

## Playing

A journey is divided into chapters, which unlock one after another. Progress is
saved in the browser after every station (no accounts, nothing leaves the
device), so it can be continued another day with “Continuă călătoria”.
Finished chapters can be replayed for more stars.

The teacher can open every chapter with `?profesor`, e.g.
`route-01/?profesor`.

## Running locally

The game uses JavaScript modules, so it must be served over HTTP (opening
`index.html` directly from disk does not work). The small development server
in the repository also turns off the browser cache, so a changed file is
always loaded fresh:

```sh
python3 serve.py
```

Then open <http://localhost:8000/route-01/>.

To try it on a phone or tablet in the same Wi-Fi network, start it with
`python3 serve.py 8000 0.0.0.0` and open `http://<computer IP>:8000/route-01/`
on the device.

## Testing helpers

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
Station ids are listed in the `js/route-data.js` file of every journey (`route-01/`, `route-02/`, `route-03/`).

The game is published inside [lumea-lui-bubu](../lumea-lui-bubu), in its
folder `trenul-lui-bubu/`: the “← Lumea lui Bubu” button of the home page
goes back to the village (`../`).

The home page shows a landscape with a train in the colours of the season
(winter, spring, summer or autumn), chosen from the calendar like the modes
of lumea-lui-bubu (`home/season.js`, where `MODE` can also keep one season
on). To see another season, add it to the address of the home page:
`?mode=winter`, `?mode=spring`, `?mode=summer` or `?mode=autumn`.

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
route-01/js/         winter route, winter missions and entry point
```
