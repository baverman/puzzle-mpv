# Puzzle MPV

Watch Puzzle Movies series episodes in MPV with English and optional Russian subtitles.

## Direct use

Provide a recent `getEpisodeData` JSON response:

```bash
./puzzle-mpv getEpisodeData.json
```

Defaults:

- Primary subtitles: English
- Secondary subtitles: Russian

## Windows with MSYS2 UCRT64

```cmd
windows\puzzle-mpv.cmd episode.puzzlemovie
```

The wrapper prepends `C:\msys64\ucrt64\bin` and `C:\msys64\usr\bin` to `PATH`.

## MPV controls

- `Space`: pause and open the bilingual subtitle menu
- `Space` again: close the menu and resume
- `Tab`: hide or restore the menu while paused
- `Up` / `Down`: select a phrase
- `Page Up` / `Page Down`: move five phrases
- `Enter`: seek to the selected phrase and resume
- `Alt+v`: toggle secondary subtitles
- `g`, then `b`: open the bilingual menu directly

## Firefox extension

The extension currently supports series episodes only.

Temporary installation:

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Select `firefox-extension/manifest.json`.
4. Open or refresh a series page.
5. Select an episode.
6. Select **Export for player** in the lower-right corner.

Example output:

```text
The Institute - S01E01 - The Boy.puzzlemovie
```

## Linux `.puzzlemovie` handler

```bash
install -Dm644 linux/puzzlemovie.xml \
  "$HOME/.local/share/mime/packages/puzzlemovie.xml"

install -Dm644 linux/puzzle-mpv.desktop \
  "$HOME/.local/share/applications/puzzle-mpv.desktop"

update-mime-database "$HOME/.local/share/mime"
update-desktop-database "$HOME/.local/share/applications"
xdg-mime default puzzle-mpv.desktop application/x-puzzlemovie
```

Restart Firefox, load the temporary extension again, and export an episode. Select **Open with Puzzle MPV** in Firefox's file dialog.

Media URLs can expire. Open exported files soon after downloading them.

## Troubleshooting

### The extension disappeared

Temporary extensions are removed when Firefox restarts. Load `firefox-extension/manifest.json` again through `about:debugging`.

### Firefox does not offer Puzzle MPV

Check the exported file's MIME type:

```bash
gio info -a standard::content-type \
  "$HOME/Downloads/example.puzzlemovie"
```

The output must contain `application/x-puzzlemovie`.

Check the default handler:

```bash
xdg-mime query default application/x-puzzlemovie
```

The output must be `puzzle-mpv.desktop`.

### Export fails

Reload the extension from `about:debugging`, refresh the series page, select an episode, and try again. The browser console contains the API error details.
