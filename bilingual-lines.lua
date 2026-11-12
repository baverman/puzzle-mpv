local mp = require "mp"
local utils = require "mp.utils"

local episode_path = os.getenv("PUZZLE_MPV_EPISODE_JSON")
local primary_language = os.getenv("PUZZLE_MPV_PRIMARY") or "en"
local secondary_language = os.getenv("PUZZLE_MPV_SECONDARY") or "ru"

local phrases = nil
local menu_open = false
local menu_visible = false
local selected_phrase = 1
local overlay = mp.create_osd_overlay("ass-events")

local menu_binding_names = {
    "bilingual-lines-up",
    "bilingual-lines-down",
    "bilingual-lines-page-up",
    "bilingual-lines-page-down",
    "bilingual-lines-select",
    "bilingual-lines-visibility",
}

local function read_file(path)
    local file, open_error = io.open(path, "r")
    if not file then
        return nil, open_error
    end
    local content = file:read("*a")
    file:close()
    return content
end

local function one_line(value)
    if type(value) ~= "string" then
        return ""
    end
    return value:gsub("[\r\n]+", " "):gsub("%s+", " "):match("^%s*(.-)%s*$")
end

local function load_phrases()
    if phrases then
        return phrases
    end
    if not episode_path or episode_path == "" then
        return nil, "episode JSON path was not provided"
    end

    local content, read_error = read_file(episode_path)
    if not content then
        return nil, "cannot read episode JSON: " .. tostring(read_error)
    end

    local episode, parse_error = utils.parse_json(content)
    if not episode then
        return nil, "cannot parse episode JSON: " .. tostring(parse_error)
    end
    if type(episode.subtitles) ~= "table" then
        return nil, "episode JSON has no subtitles array"
    end

    phrases = {}
    for _, cue in ipairs(episode.subtitles) do
        if type(cue) == "table" and type(cue.start) == "number" then
            local primary = one_line(cue[primary_language])
            local secondary = one_line(cue[secondary_language])
            if primary ~= "" or secondary ~= "" then
                phrases[#phrases + 1] = {
                    start = cue.start,
                    primary = primary,
                    secondary = secondary,
                }
            end
        end
    end

    if #phrases == 0 then
        return nil, "no subtitle lines found"
    end
    return phrases
end

local function escape_ass(text)
    return mp.command_native({ "escape-ass", text })
end

local function render_menu()
    if not menu_open or not menu_visible or not phrases then
        return
    end

    local width, height = mp.get_osd_size()
    if width <= 0 or height <= 0 then
        width, height = 1280, 720
    end

    local font_size = math.max(18, math.min(32, math.floor(height / 22)))
    local line_height = font_size * 1.25
    local language_gap = font_size * 0.25
    local phrase_gap = font_size * 0.75
    local phrase_height = line_height * 2 + language_gap + phrase_gap
    local text_left = math.floor(width * 0.06)
    local text_top = math.floor(height * 0.06)
    local phrase_top = text_top + line_height + phrase_gap
    local available_height = math.floor(height * 0.94) - phrase_top
    local visible_count = math.max(1, math.floor(available_height / phrase_height))
    local first = math.max(1, selected_phrase - math.floor(visible_count / 2))
    local last = math.min(#phrases, first + visible_count - 1)
    first = math.max(1, last - visible_count + 1)

    local events = {
        string.format(
            "{\\an7\\pos(%d,%d)\\fs%d\\bord2\\shad0\\b1}%s + %s subtitle lines  [%d/%d]",
            text_left,
            text_top,
            font_size,
            escape_ass(primary_language),
            escape_ass(secondary_language),
            selected_phrase,
            #phrases
        ),
    }

    local y = phrase_top
    for index = first, last do
        local phrase = phrases[index]
        local style
        if index == selected_phrase then
            style = "\\c&H66FFFF&\\b1"
        else
            style = "\\c&HFFFFFF&\\b0"
        end

        if phrase.primary ~= "" then
            events[#events + 1] = string.format(
                "{\\an7\\pos(%d,%d)\\fs%d\\bord2\\shad0%s}%s",
                text_left,
                math.floor(y),
                font_size,
                style,
                escape_ass(phrase.primary)
            )
            y = y + line_height
            if phrase.secondary ~= "" then
                y = y + language_gap
            end
        end
        if phrase.secondary ~= "" then
            events[#events + 1] = string.format(
                "{\\an7\\pos(%d,%d)\\fs%d\\bord2\\shad0%s}%s",
                text_left,
                math.floor(y),
                font_size,
                style,
                escape_ass(phrase.secondary)
            )
            y = y + line_height
        end
        y = y + phrase_gap
    end

    local panel_left = math.floor(width * 0.04)
    local panel_top = math.floor(height * 0.035)
    local panel_right = math.floor(width * 0.96)
    local panel_bottom = math.min(
        math.floor(height * 0.965),
        math.ceil(y - phrase_gap + font_size * 0.4)
    )
    table.insert(
        events,
        1,
        string.format(
            "{\\an7\\pos(0,0)\\p1\\bord0\\shad0\\1c&H000000&\\1a&H50&}m %d %d l %d %d l %d %d l %d %d{\\p0}",
            panel_left,
            panel_top,
            panel_right,
            panel_top,
            panel_right,
            panel_bottom,
            panel_left,
            panel_bottom
        )
    )

    overlay.res_x = width
    overlay.res_y = height
    overlay.data = table.concat(events, "\n")
    overlay:update()
end

local function remove_menu_bindings()
    for _, name in ipairs(menu_binding_names) do
        mp.remove_key_binding(name)
    end
end

local function close_menu(resume)
    if not menu_open then
        return
    end
    menu_open = false
    menu_visible = false
    remove_menu_bindings()
    overlay:remove()
    if resume then
        mp.set_property_bool("pause", false)
    end
end

local function move_selection(amount)
    selected_phrase = math.max(1, math.min(#phrases, selected_phrase + amount))
    render_menu()
end

local function toggle_menu_visibility()
    if not menu_open then
        return
    end

    menu_visible = not menu_visible
    if menu_visible then
        render_menu()
    else
        overlay:remove()
    end
end

local function select_phrase()
    local phrase = phrases and phrases[selected_phrase]
    if phrase then
        mp.commandv("seek", phrase.start, "absolute+exact")
    end
    close_menu(true)
end

local function add_menu_bindings()
    mp.add_forced_key_binding("UP", menu_binding_names[1], function() move_selection(-1) end, { repeatable = true })
    mp.add_forced_key_binding("DOWN", menu_binding_names[2], function() move_selection(1) end, { repeatable = true })
    mp.add_forced_key_binding("PGUP", menu_binding_names[3], function() move_selection(-5) end, { repeatable = true })
    mp.add_forced_key_binding("PGDWN", menu_binding_names[4], function() move_selection(5) end, { repeatable = true })
    mp.add_forced_key_binding("ENTER", menu_binding_names[5], select_phrase)
    mp.add_forced_key_binding("TAB", menu_binding_names[6], toggle_menu_visibility)
end

local function show_bilingual_lines()
    local loaded_phrases, load_error = load_phrases()
    if not loaded_phrases then
        mp.osd_message("Bilingual subtitle lines: " .. load_error, 4)
        return
    end

    local position = mp.get_property_number("time-pos", 0)
    selected_phrase = 1
    for index, phrase in ipairs(loaded_phrases) do
        if phrase.start <= position then
            selected_phrase = index
        else
            break
        end
    end

    menu_open = true
    menu_visible = true
    add_menu_bindings()
    render_menu()
end

local function toggle_pause_with_bilingual_lines()
    if menu_open then
        close_menu(true)
    elseif mp.get_property_bool("pause") then
        mp.set_property_bool("pause", false)
    else
        mp.set_property_bool("pause", true)
        show_bilingual_lines()
    end
end

mp.register_event("video-reconfig", render_menu)
mp.add_key_binding("g-b", "bilingual-subtitle-lines", show_bilingual_lines)
mp.add_forced_key_binding("SPACE", "pause-with-bilingual-lines", toggle_pause_with_bilingual_lines)
