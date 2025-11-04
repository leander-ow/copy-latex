// mathjax-inject.js
// Enhanced page script to extract LaTeX for MathJax v3/v4 reliably
// - Multiple extraction strategies (MathJax internal, nearby <script type="math/tex">, MathML <annotation>, attributes).
// - Robust to ShadowRoot (tries getRootNode and shadowRoot).
// - Emits console logs for debugging and posts messages to the content script.
//
// Sends window.postMessage({ type: 'HoverLatex_MathJaxV3', latex, mjxId }, '*')
// mjxId is best-effort (may be null). Keep logs to diagnose Firefox-specific issues.

(function() {
  function log(...args) {
    try { console.log('[mathjax-inject]', ...args); } catch(e) {}
  }

  const mathjax = window.MathJax;
  const version = mathjax && mathjax.version ? mathjax.version : null;
  if (!mathjax || !(version && (version.startsWith('3') || version.startsWith('4')))) {
    log('MathJax v3/v4 not detected (version=', version, '), aborting injector.');
    return;
  }

  // Try several strategies to extract original TeX for an mjx-container node
  function extractFromScriptSibling(node) {
    // Look forward and backward among siblings for <script type="math/tex"> or display variant
    const types = ['math/tex', 'math/tex; mode=display', 'text/x-mathjax-config'];
    let s = node;
    for (let i = 0; i < 8 && s; i++) {
      if (s.nextElementSibling) {
        s = s.nextElementSibling;
        if (s.tagName === 'SCRIPT' && types.includes(s.type)) {
          log('extractFromScriptSibling: found next script', s.type);
          return s.textContent.trim();
        }
      } else break;
    }
    s = node;
    for (let i = 0; i < 8 && s; i++) {
      if (s.previousElementSibling) {
        s = s.previousElementSibling;
        if (s.tagName === 'SCRIPT' && types.includes(s.type)) {
          log('extractFromScriptSibling: found previous script', s.type);
          return s.textContent.trim();
        }
      } else break;
    }
    return null;
  }

  function extractFromMathJaxInternal(node) {
    try {
      // Defensive: ensure startup.document.math exists and is iterable in some form
      const docMath = (MathJax.startup && MathJax.startup.document && MathJax.startup.document.math);
      if (!docMath) return null;

      // docMath is a linked structure in many builds. Iterate safely.
      let head = docMath.list || docMath;
      let seen = new Set();
      let cur = head;
      const targetHTML = (node && node.innerHTML) ? node.innerHTML.replace(/\s+/g,' ').trim() : null;

      while (cur && cur.data && !seen.has(cur)) {
        seen.add(cur);
        const mathItem = cur.data;
        try {
          // typesetRoot might be in a shadowRoot; compare stringified markup loosely
          if (mathItem.typesetRoot) {
            const root = mathItem.typesetRoot;
            const rootHTML = (root.innerHTML || '').replace(/\s+/g,' ').trim();
            if (targetHTML && rootHTML === targetHTML) {
              if (mathItem.math && typeof mathItem.math === 'string') {
                log('extractFromMathJaxInternal: matched by typesetRoot.innerHTML');
                return mathItem.math.trim();
              }
              // sometimes source is in mathItem.input or mathItem.display
              if (mathItem.input && typeof mathItem.input === 'string') {
                log('extractFromMathJaxInternal: found mathItem.input');
                return mathItem.input.trim();
              }
            }
          }
        } catch (e) {
          // ignore per-item extraction errors
        }
        cur = cur.next;
        if (!cur) break;
      }
    } catch (e) {
      log('extractFromMathJaxInternal error', e);
    }
    return null;
  }

  function extractFromMathMLAnnotation(node) {
    try {
      // MathJax may include a MathML <annotation encoding="application/x-tex"> inside the rendered math.
      // We must check both the node's subtree and open shadowRoot if present.
      const tryQuery = (root) => {
        if (!root) return null;
        let ann = root.querySelector && root.querySelector('annotation[encoding="application/x-tex"]');
        if (ann && ann.textContent && ann.textContent.trim()) {
          log('extractFromMathMLAnnotation: found annotation in root');
          return ann.textContent.trim();
        }
        // sometimes KaTeX-like annotation sits under .math or .mml elements
        ann = root.querySelector && root.querySelector('annotation');
        if (ann && ann.getAttribute && ann.getAttribute('encoding') === 'application/x-tex' && ann.textContent) {
          return ann.textContent.trim();
        }
        return null;
      };

      // check node itself
      let res = tryQuery(node);
      if (res) return res;

      // check shadowRoot if available
      if (node.shadowRoot) {
        res = tryQuery(node.shadowRoot);
        if (res) return res;
      }

      // check the element's root node (could be document or shadow root)
      const rootNode = node.getRootNode && node.getRootNode();
      if (rootNode && rootNode !== document) {
        res = tryQuery(rootNode);
        if (res) return res;
      }

      // also scan descendants for <math> elements with annotation
      const mathEls = node.querySelectorAll ? node.querySelectorAll('math') : [];
      for (const m of mathEls) {
        const a = m.querySelector && m.querySelector('annotation[encoding="application/x-tex"]');
        if (a && a.textContent && a.textContent.trim()) return a.textContent.trim();
      }
    } catch (e) {
      log('extractFromMathMLAnnotation error', e);
    }
    return null;
  }

  function extractFromAttributes(node) {
    try {
      if (!node || !node.getAttribute) return null;
      const candidates = [
        node.getAttribute('data-tex'),
        node.getAttribute('data-latex'),
        node.getAttribute('aria-label'),
        node.getAttribute('data-original') // arbitrary fallsbacks
      ];
      for (const c of candidates) {
        if (c && c.trim()) {
          log('extractFromAttributes: found attribute source');
          return c.trim();
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  function extractLatexForContainer(mjxContainer) {
    if (!mjxContainer) return null;

    // 1) Try MathJax internal mapping
    let tex = extractFromMathJaxInternal(mjxContainer);
    if (tex) return tex;

    // 2) Try MathML annotation (works if MathJax left MathML with annotation)
    tex = extractFromMathMLAnnotation(mjxContainer);
    if (tex) return tex;

    // 3) Try nearby <script type="math/tex"> siblings (good for older integrations)
    tex = extractFromScriptSibling(mjxContainer);
    if (tex) return tex;

    // 4) Try attributes fallback
    tex = extractFromAttributes(mjxContainer);
    if (tex) return tex;

    return null;
  }

  function post(mjx, latex) {
    try {
      const mjxId = mjx && mjx.getAttribute ? mjx.getAttribute('ctxtmenu_counter') : null;
      log('posting latex', { latex: latex ? (latex.length > 120 ? latex.slice(0,120)+'…' : latex) : latex, mjxId });
      window.postMessage({ type: 'HoverLatex_MathJaxV3', latex: latex, mjxId: mjxId }, '*');
    } catch (e) {
      log('post error', e);
    }
  }

  // Perform extraction on mouseover / click. Use capture to get events early.
  document.addEventListener('mouseover', function(e) {
    try {
      const mjx = e.target && e.target.closest ? e.target.closest('mjx-container') : null;
      if (!mjx) return;
      const latex = extractLatexForContainer(mjx);
      if (latex) post(mjx, latex);
      else log('no latex found for mjx-container via any strategy', mjx);
    } catch (e) {
      log('mouseover handler error', e);
    }
  }, true);

  document.addEventListener('click', function(e) {
    try {
      const mjx = e.target && e.target.closest ? e.target.closest('mjx-container') : null;
      if (!mjx) return;
      const latex = extractLatexForContainer(mjx);
      if (latex) post(mjx, latex);
      else log('no latex found for mjx-container on click', mjx);
    } catch (e) {
      log('click handler error', e);
    }
  }, true);

  // Additionally observe newly added mjx-container nodes and do an initial extraction pass.
  try {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node && node.nodeType === 1) {
            const tag = node.tagName && node.tagName.toLowerCase();
            if (tag === 'mjx-container' || node.classList && node.classList.contains('MathJax')) {
              const latex = extractLatexForContainer(node);
              if (latex) post(node, latex);
            }
            // also look for descendants
            const found = node.querySelectorAll ? node.querySelectorAll('mjx-container, .MathJax') : [];
            for (const f of found) {
              const latex = extractLatexForContainer(f);
              if (latex) post(f, latex);
            }
          }
        }
      }
    });
    mo.observe(document.documentElement || document, { childList: true, subtree: true });
  } catch (e) {
    log('MutationObserver setup failed', e);
  }

  // Initial scan: existing containers
  try {
    const existing = document.querySelectorAll ? document.querySelectorAll('mjx-container, .MathJax, .mjx-chtml') : [];
    for (const el of existing) {
      const latex = extractLatexForContainer(el);
      if (latex) {
        // don't spam: post once per element on initial scan
        post(el, latex);
      }
    }
  } catch (e) {
    log('initial scan error', e);
  }

  log('mathjax-inject ready (v' + version + ')');
})();