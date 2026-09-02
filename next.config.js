// Root boundary for reproducible builds & clean source-of-truth.
const path = require('path');

module.exports = {
  // Tell Next.js exactly which directory is the project root
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // Existing ignore + rule config preserved below
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zyolnitnvmzfttvwjyle.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};
