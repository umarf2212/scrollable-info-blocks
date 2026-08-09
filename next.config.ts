import type { NextConfig } from "next";

const isGitHubPages = process.env.INFOBLOCKS_PAGES === "true";
const pagesAssetPrefix = process.env.INFOBLOCKS_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        assetPrefix: pagesAssetPrefix,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
