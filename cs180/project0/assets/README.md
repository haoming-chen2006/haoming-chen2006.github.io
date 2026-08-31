# What to drop in here

Filenames are hard-coded in `index.html`. Either match them exactly, or
change the `src` in the HTML — whichever you prefer. JPEG is fine for the
stills; the dolly zoom has to be a GIF.

Before committing, resize the long edge of every JPEG down to ~1600 px and
keep each file under ~1 MB. Full-res phone photos will make the page crawl
and blow up the repo.

    # from the project root — sips is built into macOS, no install needed
    sips -Z 1600 assets/part1/*.jpg assets/part2/*.jpg assets/part3/*.jpg

## Images

    assets/part1/selfie-close.jpg     close up, no zoom — the distorted one
    assets/part1/selfie-far.jpg       stepped back + zoomed, face the same size in frame

    assets/part2/building-zoom.jpg    shot from far away, zoomed in — looks flat
    assets/part2/building-close.jpg   walked up, no zoom — same building size in frame

    assets/part3/dolly-zoom.gif       the animated result
    assets/part3/still-1.jpg          the individual frames, in order
    assets/part3/still-2.jpg          (add or delete <figure> blocks in the
    assets/part3/still-3.jpg           .strip div to match how many you shot)
    assets/part3/still-4.jpg
    assets/part3/still-5.jpg
    assets/part3/still-6.jpg

Making the GIF from your stills:

    ffmpeg -framerate 4 -pattern_type glob -i 'assets/part3/still-*.jpg' \
      -vf "scale=800:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" \
      -loop 0 assets/part3/dolly-zoom.gif

Lower `-framerate` for a slower loop. Glob order is alphabetical, so keep the
frames zero-padded past nine (`still-01.jpg`) if you shoot more than nine.

## Text

Every one of these is marked with a `FILL IN` comment in `index.html`.

| Where | What |
| --- | --- |
| `.lede` in `<header class="masthead">` | One paragraph: where you shot these, what camera, what surprised you. |
| Part 1 — two `.meta` spans | Real subject distance and focal length for each shot. |
| Part 1 — `.note` paragraph | Why the second portrait looks better. |
| Part 2 — two `.meta` spans | Real subject distance and focal length for each shot. |
| Part 2 — `.note` paragraph | Why the zoomed shot looks compressed. |
| Part 3 — `.setup` paragraph | One line on the subject, the background, and how far you walked. |
| Part 3 — `.note` paragraph | How the zoom and the dolly cancel each other out. |
| `<footer>` | Your name and credit line. |

Each `FILL IN` comment for the three `.note` paragraphs already lists the
points worth hitting — write over them in your own words and delete the
comment.
