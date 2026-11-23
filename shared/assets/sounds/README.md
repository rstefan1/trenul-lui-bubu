# Sounds

The game plays these recordings (MP3); if a file is missing, the game is
simply silent for that sound.

| File          | Used for                                   | Source |
|---------------|--------------------------------------------|--------|
| `train.mp3`   | the train running (looped, follows speed)  | "train yokosuka" by funazou (Freesound), via Pixabay: https://pixabay.com/sound-effects/city-train-yokosuka-79155/ |
| `whistle.mp3` | the whistle (leaving a station, "Fluieră!") | "train whistle" by SoundsGoodMusic, via Pixabay: https://pixabay.com/sound-effects/film-special-effects-train-whistle-306031/ |
| `brakes.mp3`  | the brakes squealing before every stop      | downloaded from Pixabay (free under the Pixabay Content License) |
| `railway-station-platform.mp3` | the sound of a station platform (station missions) | "railway station platform" (freesound_community), via Pixabay |
| `station-crowd.mp3` | a crowd (stations, the Christmas fair) | "crowds at train station" (freesound_community), via Pixabay |
| `town-square.mp3` | a town square in the evening (Arad, Cluj, Rădăuți, the fair); its first 45 s | "village square" (freesound_community), via Pixabay |
| `winter-wind.mp3` | the wind (fortresses, the forest, the monasteries) | "winter wind" by Dragon Studio, via Pixabay |
| `freight-train-passing.mp3` | a freight train in the railway yard (Dej) | "freight train 01" (freesound_community), via Pixabay |

All are free to use under the Pixabay Content License. The other sounds of
the game (the effects, the carols) are synthesised in code.

## Compression

The recordings are kept small, so the game loads fast on phones. Every new
recording is compressed the same way before it is committed (mono, no
metadata):

```sh
# sounds of places, heard softly in the background
ffmpeg -i in.mp3 -vn -map_metadata -1 -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k out.mp3
# the train, the whistle, the brakes (heard clearly)
ffmpeg -i in.mp3 -vn -map_metadata -1 -ac 1 -ar 44100 -c:a libmp3lame -b:a 128k out.mp3
```

A long background recording is also cut to well under a minute (a loop
does not need more, and every minute takes about 10 MB once decoded), with
no new compression, choosing an even part without loud events:

```sh
ffmpeg -i in.mp3 -t 45 -c copy -map_metadata -1 out.mp3
```

The silence an MP3 has at both ends is trimmed when the game loads it, so
the loops stay seamless.
