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
