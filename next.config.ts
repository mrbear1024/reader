import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /* config options here */
  webpack: (config) => {
    // 处理canvas依赖
    config.resolve.alias.canvas = false;
    
    // 支持PDF.js和react-pdf
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      process: false,
    };
    
    return config;
  },

   // Turbopack配置
   experimental: {
    turbo: {
      resolveAlias: {
        // 处理canvas依赖
        canvas: 'false'
      },
      // 你可以在这里添加更多Turbopack特定配置
    }
  }
};


export default nextConfig;
