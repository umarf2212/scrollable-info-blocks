import type { NextConfig } from "next";

const isGitHubPages = process.env.INFOBLOCKS_PAGES === "true";
const pagesBasePath = process.env.INFOBLOCKS_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: pagesBasePath,
        assetPrefix: pagesBasePath,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
