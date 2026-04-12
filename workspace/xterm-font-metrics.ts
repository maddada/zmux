import type { TerminalAppearanceOptions } from "./terminal-appearance";

export type XtermFontMetrics = TerminalAppearanceOptions & {
  charHeight: number;
  charWidth: number;
};

const lastFontMeasurementByKey = new Map<string, XtermFontMetrics>();

function getFontMeasurementCacheKey(
  appearance: TerminalAppearanceOptions,
  devicePixelRatio: number,
  useDevicePixelAdjustment: boolean,
): string {
  return JSON.stringify([
    appearance.fontFamily,
    appearance.fontSize,
    appearance.letterSpacing,
    appearance.lineHeight,
    devicePixelRatio,
    useDevicePixelAdjustment,
  ]);
}

export function measureTerminalFont(options: {
  appearance: TerminalAppearanceOptions;
  container: HTMLElement;
  useDevicePixelAdjustment?: boolean;
}): XtermFontMetrics | null {
  const { appearance, container, useDevicePixelAdjustment = true } = options;
  const document = container.ownerDocument;
  const window = document.defaultView;
  if (!window) {
    return null;
  }

  const cacheKey = getFontMeasurementCacheKey(
    appearance,
    window.devicePixelRatio,
    useDevicePixelAdjustment,
  );
  const parent = container.isConnected ? container : document.body;
  if (!parent) {
    return lastFontMeasurementByKey.get(cacheKey) ?? null;
  }

  const measurementElement = document.createElement("div");
  const style = measurementElement.style;
  style.position = "absolute";
  style.top = "-9999px";
  style.left = "0";
  style.display = "inline-block";
  style.visibility = "hidden";
  style.whiteSpace = "pre";
  style.fontFamily = appearance.fontFamily;
  style.fontSize = `${appearance.fontSize}px`;
  style.lineHeight = "normal";
  measurementElement.textContent = "X";
  parent.append(measurementElement);

  const rect = measurementElement.getBoundingClientRect();
  measurementElement.remove();

  if (!rect.width || !rect.height) {
    return lastFontMeasurementByKey.get(cacheKey) ?? null;
  }

  const letterSpacingAdjustment = Math.round(appearance.letterSpacing);
  const charWidth = useDevicePixelAdjustment
    ? (Math.floor(rect.width * window.devicePixelRatio) + letterSpacingAdjustment) /
        window.devicePixelRatio -
      letterSpacingAdjustment / window.devicePixelRatio
    : rect.width;
  const measurement: XtermFontMetrics = {
    ...appearance,
    charHeight: Math.ceil(rect.height),
    charWidth,
  };
  lastFontMeasurementByKey.set(cacheKey, measurement);
  return measurement;
}

export function getXtermViewportDimensions(options: {
  containerHeight: number;
  containerWidth: number;
  font: XtermFontMetrics;
  window: Window;
}): { cols: number; rows: number } | null {
  const { containerHeight, containerWidth, font, window } = options;
  if (!font.charWidth || !font.charHeight || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  const scaledWidthAvailable = containerWidth * window.devicePixelRatio;
  const scaledCharWidth = font.charWidth * window.devicePixelRatio + Math.round(font.letterSpacing);
  const cols = Math.max(Math.floor(scaledWidthAvailable / scaledCharWidth), 1);

  const scaledHeightAvailable = containerHeight * window.devicePixelRatio;
  const scaledCharHeight = Math.ceil(font.charHeight * window.devicePixelRatio);
  const scaledLineHeight = Math.floor(scaledCharHeight * font.lineHeight);
  if (scaledLineHeight <= 0) {
    return null;
  }

  const rows = Math.max(Math.floor(scaledHeightAvailable / scaledLineHeight), 1);
  return { cols, rows };
}
