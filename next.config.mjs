import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => {
  // NEXT_PUBLIC_API_URL is compiled into browser code: fail the build, not the page.
  if (phase === PHASE_PRODUCTION_BUILD) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url || !/^https?:\/\/[^\s]+$/.test(url)) {
      throw new Error('NEXT_PUBLIC_API_URL must be set to an absolute http(s) URL at build time.');
    }
  }
  return { output: 'standalone' };
};

export default nextConfig;
