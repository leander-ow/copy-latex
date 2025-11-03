# CopyLaTeX

A browser extension (Chrome & Firefox) that lets you quickly copy LaTeX code (KaTeX or MathJax) from equations displayed on websites like ChatGPT, DeepSeek, or any blog using mathematical equations. It works simply by hovering over an equation and clicking to copy the LaTeX expression.

Version 1.1: Now it also works with with Wikipedia and Wikiwand images.

## How it works technically

1. **Content Script (`content.js`)**:
   - Automatically detects all `<span class="katex">` elements on the page.
   - Extracts the LaTeX code from `<annotation encoding="application/x-tex">`.
   - Shows an overlay when hovering over the equation.
   - Allows clicking to copy the code to clipboard using `navigator.clipboard.writeText()`.
   - Uses an inline `<svg>` to avoid external file dependencies.

2. **CSS (`overlay.css`)**:
   - Overlay styling: white background, subtle border and shadow.
   - Large, readable text.
   - Centered over the KaTeX formula.
   - `pointer` cursor.

3. **Extension declaration `manifest.json`**:
   - Injects `content.js` and `overlay.css`.

## Example GIFs
#### KaTeX
<img src="assets/gif-demo-katex.gif" alt="Demo-KaTeX" width="800">

#### MathJax
<img src="assets/gif-demo-mathjax.gif" alt="Demo-MathJax" width="800">

#### Wikipedia images
<img src="assets/gif-demo-wikipedia.gif" alt="Demo-MathJax" width="800">

## Popular Sites Using MathJax/KaTeX
Generally any math, physics, or engineering-related blog or website. Some typical examples:
- KaTeX: ChatGPT, DeepSeek, Notion...
- MathJax: Math Stack Exchange, ProofWiki...

## Host permissions and speed
The javascript source code is extremely simple and available [here](https://github.com/Mapaor/copy-latex-chrome-extension/blob/main/content.js). It loads after everything and is blazingly fast.

### Chrome

You can customize on which sites the extension loads via `chrome://extensions` → 'Details'.

<img src="assets/only-specific-sites.jpg" alt="Manage allowed hosts Chrome" width="800">

<img src="assets/example-specific-site.jpg" alt="Adding an allowed host Chrome" width="800">

<details>
<summary>Recommended websites to add</summary>

- https://chatgpt.com/*
- https://chat.deepseek.com/*
- https://math.stackexchange.com/*
- https://physics.stackexchange.com/*
- https://proofwiki.org/*
- https://\*.wikipedia.org/*
- https://www.wikiwand.com/*
- https://mathoverflow.net/*
- https://\*.notion.site/*
- https://publish.obsidian.md/*
- https://nbviewer.org/*
- https://www.phind.com/*
- https://chat.mistral.ai/*
- https://librechat-librechat.hf.space/*
- https://www.perplexity.ai/*
- https://phys.libretexts.org/*

</details>

### Firefox

You can manage site permissions via **Firefox Settings > Extensions & Themes** (or `about:addons`), select the extension, and go to **Permissions and Data**:

<img src="assets/toggle-firefox.jpg" alt="Manage extension permissions Firefox" width="800">

In case you turn off the "all sites" toggle option, you can also add manual sites that are not in the default list:

<img src="assets/manual-specific-site.jpg" alt="Manage extension permissions Firefox" width="800">

And now the custom site should appear as a new toggle in the "Permissions and data" tab.

* [Chrome Web Store](https://chromewebstore.google.com/detail/copy-latex-katex-mathjax/lmhdbdfaadjfjclobmodomehekpjpkgn)
* [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/copy-latex)
* [GitHub Repo](https://github.com/Mapaor/copy-latex-chrome-extension)
* [README as a website](https://mapaor.github.io/copy-latex-chrome-extension/)

# Related

You can also use this extension in Brave and Arc (they support Chrome extensions by default). 

I also plan to adapt this code for Edge and Opera and publish in their respective places. 

A Safari version is not planned because publishing in Safari is ridiculously expensive.