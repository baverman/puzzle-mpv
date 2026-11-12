# Puzzle Movies Exporter

Firefox extension for exporting Puzzle Movies series episodes and standalone movies as `.puzzlemovie` files.

## Temporary installation

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Select `manifest.json` from this directory.
4. Open or refresh a Puzzle Movies page.
5. For a series, select an episode so its slug appears in the URL hash.
6. Select **Export for player** in the lower-right corner.

For series episodes, the extension requests `/api2/movies/getEpisodeData`. For standalone movies, it reads the subtitles and media URLs embedded in the page.

For player usage and Linux file-handler setup, see [`../README.md`](../README.md).
