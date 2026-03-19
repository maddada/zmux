type SupportedZmxTarget = "darwin-arm64" | "darwin-x64" | "linux-arm64" | "linux-x64";

const ZMX_VERSION = "0.4.2";

const ZMX_DOWNLOAD_URLS: Record<SupportedZmxTarget, string> = {
  "darwin-arm64": `https://zmx.sh/a/zmx-${ZMX_VERSION}-macos-aarch64.tar.gz`,
  "darwin-x64": `https://zmx.sh/a/zmx-${ZMX_VERSION}-macos-x86_64.tar.gz`,
  "linux-arm64": `https://zmx.sh/a/zmx-${ZMX_VERSION}-linux-aarch64.tar.gz`,
  "linux-x64": `https://zmx.sh/a/zmx-${ZMX_VERSION}-linux-x86_64.tar.gz`,
};

function getSupportedZmxTarget(
  platform: NodeJS.Platform,
  architecture: string,
): SupportedZmxTarget {
  if (platform === "darwin" && architecture === "arm64") {
    return "darwin-arm64";
  }

  if (platform === "darwin" && architecture === "x64") {
    return "darwin-x64";
  }

  if (platform === "linux" && architecture === "arm64") {
    return "linux-arm64";
  }

  if (platform === "linux" && architecture === "x64") {
    return "linux-x64";
  }

  throw new Error(`Unsupported zmx platform: ${platform}/${architecture}`);
}

export { getSupportedZmxTarget, ZMX_DOWNLOAD_URLS, ZMX_VERSION };
