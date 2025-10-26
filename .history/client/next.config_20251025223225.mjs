/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para deploy estático en Cloudflare
  output: 'export',
  trailingSlash: true,
  
  // Para imágenes en Cloudflare
  images: {
    unoptimized: true
  },
  
  // Tu configuración actual
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Opcional: mejorar compatibilidad
  experimental: {
    esmExternals: true
  }
};

export default nextConfig;