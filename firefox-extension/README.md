# Puzzle Movies Exporter

Firefox extension for exporting the active Puzzle Movies series episode as a `.puzzlemovie` file.

Movies are not supported yet.

## Temporary installation

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Select `manifest.json` from this directory.
4. Open or refresh a Puzzle Movies series page.
5. Select an episode so its slug appears in the URL hash.
6. Select **Export for player** in the lower-right corner.

The extension reads the active episode from the page, requests `/api2/movies/getEpisodeData`, and downloads the result.

For player usage and Linux file-handler setup, see [`../README.md`](../README.md).
