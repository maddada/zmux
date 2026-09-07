import { loadMermaid } from './mermaid-loader';

export interface MermaidTheme {
  background: string;
  foreground: string;
  dark: boolean;
}

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();
let nextId = 0;
let cacheBytes = 0;

/**
 * CDXC:SessionChat 2026-09-06 DECISION:
 * Use the official Mermaid library through one shared diagram component for chat and the Docs Markdown editor.
 * CDXC:SessionChat 2026-09-06 WHY:
 * Mermaid initialization is global, so configuration and rendering share a queue to prevent different themes from racing.
 */
export function renderMermaid(source: string, theme: MermaidTheme): Promise<string> {
  const key = JSON.stringify([source, theme]);
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return Promise.resolve(cached);
  }
  const existing = pending.get(key);
  if (existing) return existing;

  const result = queue.then(async () => {
    const mermaid = await loadMermaid();
    await document.fonts.ready;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      fontFamily: 'Arial, sans-serif',
      htmlLabels: true,
      themeVariables: {
        darkMode: theme.dark,
        background: theme.background,
        primaryColor: theme.dark ? '#252a32' : '#eef2f7',
        primaryTextColor: theme.foreground,
        primaryBorderColor: theme.dark ? '#718096' : '#64748b',
        lineColor: theme.dark ? '#a1adbd' : '#526175',
        secondaryColor: theme.dark ? '#303b49' : '#e1eaf5',
        tertiaryColor: theme.background,
        textColor: theme.foreground,
        mainBkg: theme.dark ? '#252a32' : '#eef2f7',
        edgeLabelBackground: theme.background,
        actorTextColor: theme.foreground,
        actorBkg: theme.dark ? '#252a32' : '#eef2f7',
        signalColor: theme.foreground,
        signalTextColor: theme.foreground,
      },
    });
    const id = `ghostex-mermaid-render-${++nextId}`;
    try {
      const { svg } = await mermaid.render(id, source);
      const bytes = (key.length + svg.length) * 2;
      if (bytes <= 8 * 1024 * 1024) {
        cache.set(key, svg);
        cacheBytes += bytes;
        while (cache.size > 100 || cacheBytes > 8 * 1024 * 1024) {
          const oldest = cache.entries().next().value;
          if (!oldest) break;
          cacheBytes -= (oldest[0].length + oldest[1].length) * 2;
          cache.delete(oldest[0]);
        }
      }
      return svg;
    } finally {
      document.getElementById(`d${id}`)?.remove();
    }
  });
  pending.set(key, result);
  queue = result.catch(() => undefined);
  void result.finally(() => pending.delete(key)).catch(() => undefined);
  return result;
}

/** SVG image documents isolate cached marker IDs when the same diagram occurs several times. */
export function mermaidImageUrl(svg: string): string {
  // Mermaid's HTML labels contain HTML void tags such as <br>. Serialize the
  // parsed SVG as XML so those labels are also valid in a standalone image.
  const element = new DOMParser().parseFromString(svg, 'text/html').querySelector('svg');
  if (!element) throw new Error('Mermaid returned no SVG.');
  const [, , width, height] =
    element
      .getAttribute('viewBox')
      ?.split(/[\s,]+/)
      .map(Number) ?? [];
  if (width > 0 && height > 0) {
    element.setAttribute('width', String(width));
    element.setAttribute('height', String(height));
    element.style.removeProperty('max-width');
  }
  return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(element)], { type: 'image/svg+xml' }));
}
