# Puzzle Movies Exporter

Firefox extension for exporting the active series episode as a `.puzzlemovie` JSON file for `puzzle-mpv`.

Movies are not supported yet.

## Temporary installation

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Select **Load Temporary Add-on**.
3. Select `firefox-extension/manifest.json`.
4. Open or refresh a Puzzle Movies series page.
5. Select an episode. The URL must contain its episode hash, for example:
   `#the-institute-2025-s1e1`.
6. Select **Export for player** in the lower-right corner.

Firefox saves a file such as:

```text
The Institute - S01E01 - The Boy.puzzlemovie
```

It contains the unmodified `getEpisodeData` JSON response.

## Play an exported file

Without a file association:

```bash
./puzzle-mpv ~/Downloads/'The Institute - S01E01 - The Boy.puzzlemovie'
```

Media URLs can expire. Open the exported file soon after downloading it.

## Linux file association

Create `~/.local/share/mime/packages/puzzlemovie.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-puzzlemovie">
    <comment>Puzzle Movies episode</comment>
    <glob pattern="*.puzzlemovie"/>
  </mime-type>
</mime-info>
```

Create `~/.local/share/applications/puzzle-mpv.desktop`, replacing the executable path:

```ini
[Desktop Entry]
Type=Application
Name=Puzzle MPV
Exec=/absolute/path/to/puzzle-movies/puzzle-mpv %f
MimeType=application/x-puzzlemovie;
Terminal=false
NoDisplay=true
```

Register both files:

```bash
update-mime-database ~/.local/share/mime
update-desktop-database ~/.local/share/applications
xdg-mime default puzzle-mpv.desktop application/x-puzzlemovie
```

You can then open a downloaded `.puzzlemovie` file from Firefox or the file manager.

## How episode detection works

The content script:

1. Reads the episode slug from the URL hash.
2. Finds that episode in the page's `episodes` data.
3. Reads IDs and media information from `serialInfo`.
4. Sends the same JSON `POST` request as the site to `/api2/movies/getEpisodeData`.
5. Validates and downloads the response.
