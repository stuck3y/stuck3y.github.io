import AppKit
import ServiceManagement

// BarSnip — a super dumb, super simple snippet saver for the macOS menu bar.
// Click a snippet, it's on your clipboard. That's it. That's the app.
// fmbm — for me, by me. Everything stays on this Mac.

// MARK: - Model

struct Snippet: Codable {
    var title: String?
    var text: String

    init(title: String? = nil, text: String) {
        self.title = title
        self.text = text
    }

    // Accepts either {"title": "...", "text": "..."} or a bare "string",
    // so hand-editing snippets.json can be as lazy as you like.
    init(from decoder: Decoder) throws {
        if let single = try? decoder.singleValueContainer(),
           let plain = try? single.decode(String.self) {
            self.title = nil
            self.text = plain
            return
        }
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.title = try c.decodeIfPresent(String.self, forKey: .title)
        self.text = try c.decode(String.self, forKey: .text)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(title, forKey: .title)
        try c.encode(text, forKey: .text)
    }

    private enum CodingKeys: String, CodingKey { case title, text }

    var menuTitle: String {
        if let t = title, !t.trimmingCharacters(in: .whitespaces).isEmpty {
            return Snippet.truncate(t)
        }
        let firstLine = text.split(separator: "\n").first.map(String.init) ?? text
        let trimmed = firstLine.trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty ? "(empty snippet)" : Snippet.truncate(trimmed)
    }

    private static func truncate(_ s: String, to limit: Int = 46) -> String {
        if s.count <= limit { return s }
        return String(s.prefix(limit)).trimmingCharacters(in: .whitespaces) + "…"
    }
}

// MARK: - Storage

final class SnippetStore {
    let directory: URL
    let fileURL: URL
    private(set) var snippets: [Snippet] = []
    private(set) var loadFailed = false

    init() {
        let appSupport = FileManager.default.urls(
            for: .applicationSupportDirectory, in: .userDomainMask
        ).first!
        directory = appSupport.appendingPathComponent("BarSnip", isDirectory: true)
        fileURL = directory.appendingPathComponent("snippets.json")
    }

    static let starterSnippets: [Snippet] = [
        Snippet(
            title: "👋 Welcome to BarSnip",
            text: "This is a snippet. You clicked it, so it's on your clipboard right now — go paste it somewhere and feel the power."
        ),
        Snippet(
            title: "How to add a snippet",
            text: "Copy any text anywhere, then open BarSnip and hit “New Snippet from Clipboard”."
        ),
        Snippet(
            title: "How to delete a snippet",
            text: "Hold ⌥ Option while the BarSnip menu is open — every snippet turns into a Delete button."
        ),
    ]

    func load() {
        loadFailed = false
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            snippets = Self.starterSnippets
            save()
            return
        }
        do {
            let data = try Data(contentsOf: fileURL)
            snippets = try JSONDecoder().decode([Snippet].self, from: data)
        } catch {
            // Never clobber a file we can't read — the menu will point at it instead.
            loadFailed = true
        }
    }

    func save() {
        guard !loadFailed else { return }
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let backupURL = directory.appendingPathComponent("snippets.json.bak")
            if FileManager.default.fileExists(atPath: fileURL.path) {
                try? FileManager.default.removeItem(at: backupURL)
                try? FileManager.default.copyItem(at: fileURL, to: backupURL)
            }
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes]
            let data = try encoder.encode(snippets)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            NSLog("BarSnip: failed to save snippets: \(error)")
        }
    }

    func append(_ snippet: Snippet) {
        snippets.append(snippet)
        save()
    }

    func remove(at index: Int) {
        guard snippets.indices.contains(index) else { return }
        snippets.remove(at: index)
        save()
    }
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    let store = SnippetStore()
    var statusItem: NSStatusItem!
    let menu = NSMenu()

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = statusItem.button {
            button.image = statusIcon()
            button.toolTip = "BarSnip — your snippets, one click away"
        }
        menu.delegate = self
        statusItem.menu = menu
        store.load()
    }

    private func statusIcon(symbol: String = "scissors") -> NSImage? {
        let image = NSImage(systemSymbolName: symbol, accessibilityDescription: "BarSnip")
        image?.isTemplate = true
        return image
    }

    // Reload from disk every time the menu opens, so hand edits to
    // snippets.json show up instantly. It's one tiny file; this is free.
    func menuWillOpen(_ menu: NSMenu) {
        store.load()
        rebuildMenu()
    }

    private func rebuildMenu() {
        menu.removeAllItems()

        if store.loadFailed {
            let warn = NSMenuItem(
                title: "⚠️ Couldn't read snippets.json",
                action: #selector(editSnippets), keyEquivalent: ""
            )
            warn.target = self
            menu.addItem(warn)
            menu.addItem(disabledItem("Click above to open it and fix the JSON"))
        } else if store.snippets.isEmpty {
            menu.addItem(disabledItem("No snippets yet"))
            menu.addItem(disabledItem("Copy something, then “New Snippet from Clipboard”"))
        } else {
            for (index, snippet) in store.snippets.enumerated() {
                let key = index < 9 ? String(index + 1) : ""

                let item = NSMenuItem(
                    title: snippet.menuTitle,
                    action: #selector(copySnippet(_:)), keyEquivalent: key
                )
                item.keyEquivalentModifierMask = []
                item.target = self
                item.tag = index
                item.toolTip = snippet.text // hover to preview the full text
                menu.addItem(item)

                // Held ⌥ swaps each snippet for its delete button (standard macOS alternate item).
                let delete = NSMenuItem(
                    title: "Delete “\(snippet.menuTitle)”",
                    action: #selector(deleteSnippet(_:)), keyEquivalent: key
                )
                delete.keyEquivalentModifierMask = [.option]
                delete.isAlternate = true
                delete.target = self
                delete.tag = index
                menu.addItem(delete)
            }
        }

        menu.addItem(.separator())

        let add = NSMenuItem(
            title: "New Snippet from Clipboard",
            action: #selector(addFromClipboard), keyEquivalent: "n"
        )
        add.target = self
        menu.addItem(add)

        let edit = NSMenuItem(
            title: "Edit Snippets…",
            action: #selector(editSnippets), keyEquivalent: "e"
        )
        edit.target = self
        menu.addItem(edit)

        let reveal = NSMenuItem(
            title: "Reveal Snippets in Finder",
            action: #selector(revealSnippets), keyEquivalent: "e"
        )
        reveal.keyEquivalentModifierMask = [.command, .option]
        reveal.isAlternate = true
        reveal.target = self
        menu.addItem(reveal)

        menu.addItem(.separator())

        if #available(macOS 13.0, *) {
            let login = NSMenuItem(
                title: "Start at Login",
                action: #selector(toggleLogin), keyEquivalent: ""
            )
            login.target = self
            login.state = SMAppService.mainApp.status == .enabled ? .on : .off
            menu.addItem(login)
        }

        let about = NSMenuItem(
            title: "About BarSnip",
            action: #selector(showAbout), keyEquivalent: ""
        )
        about.target = self
        menu.addItem(about)

        let quit = NSMenuItem(
            title: "Quit BarSnip",
            action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"
        )
        menu.addItem(quit)
    }

    private func disabledItem(_ title: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.isEnabled = false
        return item
    }

    // MARK: Actions

    @objc private func copySnippet(_ sender: NSMenuItem) {
        guard store.snippets.indices.contains(sender.tag) else { return }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        _ = pasteboard.setString(store.snippets[sender.tag].text, forType: .string)
        flashConfirmation()
    }

    private func flashConfirmation() {
        guard let button = statusItem.button else { return }
        button.image = statusIcon(symbol: "checkmark")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { [weak self] in
            guard let self = self, let button = self.statusItem.button else { return }
            button.image = self.statusIcon()
        }
    }

    @objc private func deleteSnippet(_ sender: NSMenuItem) {
        store.remove(at: sender.tag)
    }

    @objc private func addFromClipboard() {
        if store.loadFailed {
            editSnippets()
            return
        }
        guard let raw = NSPasteboard.general.string(forType: .string),
              !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            info(title: "Clipboard is empty",
                 text: "Copy some text first, then add it as a snippet.")
            return
        }

        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "New Snippet"
        let preview = raw.count > 200 ? String(raw.prefix(200)) + "…" : raw
        alert.informativeText = "Saving what's on your clipboard:\n\n\(preview)"
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        field.placeholderString = "Name (optional)"
        alert.accessoryView = field
        alert.window.initialFirstResponder = field

        guard alert.runModal() == .alertFirstButtonReturn else { return }
        let name = field.stringValue.trimmingCharacters(in: .whitespaces)
        store.append(Snippet(title: name.isEmpty ? nil : name, text: raw))
    }

    @objc private func editSnippets() {
        if !FileManager.default.fileExists(atPath: store.fileURL.path) {
            store.load() // first run creates the starter file
        }
        NSWorkspace.shared.open(store.fileURL)
    }

    @objc private func revealSnippets() {
        if !FileManager.default.fileExists(atPath: store.fileURL.path) {
            store.load()
        }
        NSWorkspace.shared.activateFileViewerSelecting([store.fileURL])
    }

    @objc private func toggleLogin() {
        guard #available(macOS 13.0, *) else { return }
        let service = SMAppService.mainApp
        do {
            if service.status == .enabled {
                try service.unregister()
            } else {
                try service.register()
            }
        } catch {
            info(title: "Couldn't change login item",
                 text: "\(error.localizedDescription)\n\nTip: this works best when BarSnip lives in /Applications.")
        }
    }

    @objc private func showAbout() {
        NSApp.activate(ignoringOtherApps: true)
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let alert = NSAlert()
        alert.messageText = "BarSnip \(version)"
        alert.informativeText = """
        A super dumb, super simple snippet saver.

        Click a snippet → it's on your clipboard.
        That's it. That's the app.

        Everything lives in one little JSON file on this Mac.
        No network. No accounts. No telemetry. Just snips.

        fmbm — for me, by me.
        (technically built by Claude, with love ❤️)
        """
        alert.runModal()
    }

    private func info(title: String, text: String) {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = text
        alert.runModal()
    }
}

// MARK: - Launch

// If BarSnip is already running, quietly bow out instead of adding a second pair of scissors.
if let bundleID = Bundle.main.bundleIdentifier {
    let others = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID)
        .filter { $0.processIdentifier != NSRunningApplication.current.processIdentifier }
    if !others.isEmpty {
        exit(0)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
_ = app.setActivationPolicy(.accessory)
app.run()
