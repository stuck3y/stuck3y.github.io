(() => {
    const link = document.querySelector("[data-zen-read]");
    if (!link) return;
    const prose = document.querySelector(".prose");
    if (!prose) return;

    link.addEventListener("click", (event) => {
        const blocks = [];
        for (const el of prose.querySelectorAll("p, h2, h3, blockquote, li")) {
            const text = el.textContent.trim();
            if (text) blocks.push(text);
        }
        const text = blocks.join("\n\n");
        if (!text) return;
        try {
            sessionStorage.setItem("zen-reader-incoming", text);
        } catch {
            return;
        }
        event.preventDefault();
        window.location.href = link.getAttribute("href");
    });
})();
