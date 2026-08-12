import type { NextConfig } from "next";

const isGitHubPages = process.env.INFOBLOCKS_PAGES === "true";
const pagesAssetPrefix = process.env.INFOBLOCKS_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        assetPrefix: pagesAssetPrefix,
        // vinext beta currently treats a forced-static nested route's 308
        // trailing-slash redirect as an export error. Export the clean HTML
        // file, then package it as /dsa-roadmap/index.html in the Pages job.
        trailingSlash: false,
      }
    : {}),
};

export default nextConfig;
