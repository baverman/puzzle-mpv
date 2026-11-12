(() => {
  "use strict";

  const BUTTON_ID = "puzzle-mpv-export-button";
  const DEFAULT_LABEL = "Export for player";
  const API_PATH = "/api2/movies/getEpisodeData";

  function readInlineJsonVariable(name) {
    const assignment = new RegExp(`(?:var\\s+${name}|window\\.${name})\\s*=\\s*(.+);\\s*$`, "m");
    for (const script of document.scripts) {
      if (script.src) {
        continue;
      }
      const match = script.textContent.match(assignment);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (error) {
          console.warn(`Puzzle Movies Exporter: cannot parse ${name}`, error);
        }
      }
    }
    return null;
  }

  function readPageVariable(name) {
    try {
      const pageWindow = window.wrappedJSObject;
      if (pageWindow && pageWindow[name] != null) {
        return pageWindow[name];
      }
    } catch (error) {
      console.debug(`Puzzle Movies Exporter: cannot read page variable ${name}`, error);
    }
    return readInlineJsonVariable(name);
  }

  function readInlinePlayerData() {
    for (const script of document.scripts) {
      if (script.src || !script.textContent.includes("window.__player__")) {
        continue;
      }

      const player = {};
      for (const field of ["url", "poster", "audioUrl", "hlsUrl"]) {
        const match = script.textContent.match(
          new RegExp(`\\b${field}\\s*:\\s*(["'])(.*?)\\1`)
        );
        if (match) {
          player[field] = match[2];
        }
      }
      if (player.url || player.hlsUrl) {
        return player;
      }
    }
    return null;
  }

  function readPlayerData() {
    try {
      const pageWindow = window.wrappedJSObject;
      if (pageWindow && pageWindow.__player__ != null) {
        return pageWindow.__player__;
      }
    } catch (error) {
      console.debug("Puzzle Movies Exporter: cannot read page player data", error);
    }
    return readInlinePlayerData();
  }

  function activeEpisodeContext() {
    const postName = decodeURIComponent(location.hash.slice(1));
    if (!postName) {
      return null;
    }

    const episodeGroups = readPageVariable("episodes");
    const serialInfo = readPageVariable("serialInfo");
    if (!episodeGroups || !serialInfo) {
      return null;
    }

    let activeEpisode = null;
    for (let groupIndex = 0; groupIndex < episodeGroups.length; groupIndex += 1) {
      const group = episodeGroups[groupIndex];
      const groupEpisodes = group && group.episodes;
      if (!groupEpisodes) {
        continue;
      }
      for (let episodeIndex = 0; episodeIndex < groupEpisodes.length; episodeIndex += 1) {
        const episode = groupEpisodes[episodeIndex];
        if (episode && episode.post_name === postName) {
          activeEpisode = episode;
          break;
        }
      }
      if (activeEpisode) {
        break;
      }
    }

    if (!activeEpisode) {
      return null;
    }

    const context = {
      episode: {
        id: Number(activeEpisode.ID),
        number: Number(activeEpisode.episode),
        season: Number(activeEpisode.season),
        postName: String(activeEpisode.post_name),
        title: activeEpisode.title_en ? String(activeEpisode.title_en) : "",
      },
      serial: {
        id: Number(serialInfo.movie_id),
        mediaType: Number(serialInfo.media_type),
        slug: String(serialInfo.slug || ""),
        title: serialInfo.title_en ? String(serialInfo.title_en) : String(serialInfo.slug || "Series"),
      },
    };

    if (
      !Number.isFinite(context.episode.id) ||
      !Number.isFinite(context.serial.id) ||
      !Number.isFinite(context.serial.mediaType) ||
      !context.serial.slug
    ) {
      return null;
    }
    return context;
  }

  function activeMovieContext() {
    if (!location.pathname.startsWith("/films/")) {
      return null;
    }

    const subtitles = readPageVariable("SUBTITLES");
    const player = readPlayerData();
    if (!Array.isArray(subtitles) || !player || (!player.url && !player.hlsUrl)) {
      return null;
    }

    const pathParts = location.pathname.split("/").filter(Boolean);
    const slug = String(readPageVariable("movieSlug") || pathParts[pathParts.length - 1] || "");
    const title = String(readPageVariable("movieTitle") || slug || "Movie");
    const movieID = Number(readPageVariable("movieID"));
    const postID = Number(readPageVariable("post_id"));
    const poster = player.poster || readPageVariable("posterUrl") || "";

    return {
      title,
      slug,
      movieID,
      postID,
      poster: String(poster),
      player,
      subtitles,
    };
  }

  function activeExportContext() {
    const episode = activeEpisodeContext();
    if (episode) {
      return { type: "episode", episode };
    }

    const movie = activeMovieContext();
    return movie ? { type: "movie", movie } : null;
  }

  function safeFilenamePart(value) {
    return value
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim();
  }

  function exportFilename(context) {
    if (context.type === "movie") {
      return `${safeFilenamePart(context.movie.title)}.puzzlemovie`;
    }

    const episodeContext = context.episode;
    const season = String(episodeContext.episode.season).padStart(2, "0");
    const episode = String(episodeContext.episode.number).padStart(2, "0");
    const episodeTitle = safeFilenamePart(episodeContext.episode.title);
    const titleSuffix = episodeTitle ? ` - ${episodeTitle}` : "";
    return `${safeFilenamePart(episodeContext.serial.title)} - S${season}E${episode}${titleSuffix}.puzzlemovie`;
  }

  function movieExportData(movie) {
    const data = {
      videoURL: movie.player.url ? String(movie.player.url) : "",
      subtitles: movie.subtitles,
      title: movie.title,
      slug: movie.slug,
    };

    if (movie.player.hlsUrl) {
      data.hlsUrl = String(movie.player.hlsUrl);
    }
    if (movie.player.audioUrl) {
      data.audioUrl = String(movie.player.audioUrl);
    }
    if (movie.poster) {
      data.poster = movie.poster;
    }
    if (Number.isFinite(movie.movieID)) {
      data.movieID = movie.movieID;
    }
    if (Number.isFinite(movie.postID)) {
      data.postID = movie.postID;
    }
    return data;
  }

  function downloadJson(data, filename) {
    const exportedData = Object.assign({ puzzleMovieExport: 1 }, data);
    const blob = new Blob([`${JSON.stringify(exportedData, null, 2)}\n`], {
      type: "application/x-puzzlemovie",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function setButtonState(button, state, label, title = "") {
    button.dataset.state = state;
    button.textContent = label;
    button.title = title;
    button.disabled = state === "loading";
  }

  async function exportCurrent(button) {
    const context = activeExportContext();
    if (!context) {
      setButtonState(button, "error", "Nothing to export", "Open a movie or select a series episode.");
      return;
    }

    setButtonState(button, "loading", "Exporting…");
    try {
      let exportData;
      if (context.type === "movie") {
        exportData = movieExportData(context.movie);
      } else {
        const episodeContext = context.episode;
        const requestBody = new URLSearchParams({
          structured: "1",
          postID: String(episodeContext.episode.id),
          mediaType: String(episodeContext.serial.mediaType),
          movieID: String(episodeContext.serial.id),
          slug: episodeContext.serial.slug,
          wrap_words: "true",
        });
        const response = await fetch(new URL(API_PATH, location.origin), {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: requestBody,
        });

        if (!response.ok) {
          throw new Error(`getEpisodeData returned HTTP ${response.status}`);
        }
        exportData = await response.json();
      }

      if (!exportData || !Array.isArray(exportData.subtitles)) {
        console.error("Puzzle Movies Exporter: unexpected export data", exportData);
        throw new Error("The page returned unexpected subtitle data");
      }
      if (!exportData.hlsUrl && !exportData.videoURL) {
        console.error("Puzzle Movies Exporter: export data has no media URL", exportData);
        throw new Error("The page returned no media URL");
      }

      const filename = exportFilename(context);
      downloadJson(exportData, filename);
      setButtonState(button, "success", "Exported ✓", filename);
      setTimeout(() => updateButton(button), 1800);
    } catch (error) {
      console.error("Puzzle Movies Exporter:", error);
      setButtonState(button, "error", "Export failed", error.message);
      setTimeout(() => updateButton(button), 3500);
    }
  }

  function updateButton(button) {
    const context = activeExportContext();
    if (!context) {
      button.style.display = "none";
      return;
    }

    let title;
    if (context.type === "movie") {
      title = context.movie.title;
    } else {
      const episodeContext = context.episode;
      title = `${episodeContext.serial.title} — S${episodeContext.episode.season}E${episodeContext.episode.number}`;
    }

    button.style.display = "block";
    setButtonState(button, "ready", DEFAULT_LABEL, title);
  }

  function installButton() {
    if (document.getElementById(BUTTON_ID)) {
      return;
    }

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = DEFAULT_LABEL;
    button.addEventListener("click", () => exportCurrent(button));
    document.documentElement.appendChild(button);

    updateButton(button);
    window.addEventListener("hashchange", () => updateButton(button));
    window.addEventListener("popstate", () => updateButton(button));

    let attempts = 0;
    const discoveryTimer = setInterval(() => {
      attempts += 1;
      updateButton(button);
      if (button.style.display !== "none" || attempts >= 40) {
        clearInterval(discoveryTimer);
      }
    }, 500);
  }

  installButton();
})();
