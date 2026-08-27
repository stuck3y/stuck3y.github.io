# BarSnip ✂️

A super dumb, super simple snippet saver that lives in your Mac's menu bar.

Click the scissors → click a snippet → it's on your clipboard → paste it
wherever. That's the whole app. Perfect for reusing prompts without digging
through Notes or your shell history.

**fmbm** — for me, by me. *(technically by Claude, but with love, so it counts.)*

## Install

Two commands, once:

```bash
cd barsnip
./build.sh install
```

That compiles the app from source, drops **BarSnip.app** into `/Applications`,
and launches it. Look for the little scissors in your menu bar.

> First time compiling anything on this Mac? You may need the (free) Xcode
> Command Line Tools first: `xcode-select --install`. The build script will
> tell you if that's the case.

No Xcode project, no dependencies, no package manager. One Swift file,
compiled on your machine, signed for your machine.

## Use

- **Copy a snippet** — click the ✂ in the menu bar, click a snippet. The icon
  flashes a ✓ to say "got it". Paste anywhere.
- **Keyboard** — while the menu is open, press `1`–`9` to grab the first nine
  snippets instantly.
- **Preview** — hover over a snippet for a moment to see its full text in a
  tooltip.
- **Add** — copy any text anywhere, then choose **New Snippet from Clipboard**
  (⌘N while the menu is open). Name it or don't — unnamed snippets show their
  first line.
- **Delete** — hold **⌥ Option** while the menu is open and every snippet turns
  into a Delete button. (A `snippets.json.bak` backup is kept automatically,
  just in case.)
- **Edit in bulk** — **Edit Snippets…** opens the JSON file in your editor.
  Reorder, rewrite, go wild — the menu re-reads the file every time it opens.
- **Start at Login** — toggle it in the menu so BarSnip is always there.

## Where your snippets live

One local file, yours forever:

```
~/Library/Application Support/BarSnip/snippets.json
```

The format is exactly as dumb as promised — an array:

```json
[
  { "title": "Code review prompt", "text": "Review this diff for correctness..." },
  { "text": "Snippets without a title show their first line" },
  "bare strings work too, if you're feeling lazy"
]
```

## Privacy

There is nothing to disclose because there is nothing happening. BarSnip is
local-only by construction: no network calls, no accounts, no analytics, no
special permissions. It reads one JSON file and writes to your clipboard when
you click. You can read every line of it in `Sources/main.swift`.

## Uninstall

```bash
rm -rf /Applications/BarSnip.app "$HOME/Library/Application Support/BarSnip"
```

(No hard feelings.)

## How it's put together

| File | What it is |
|---|---|
| `Sources/main.swift` | The whole app — AppKit menu bar app, ~400 lines |
| `Sources/Info.plist` | Bundle metadata (`LSUIElement` keeps it out of the Dock) |
| `Scripts/makeicon.swift` | Draws the app icon at build time |
| `build.sh` | Compiles, bundles, icons, signs, installs |
