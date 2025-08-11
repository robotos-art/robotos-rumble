/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'ipfs.io',
      'gateway.ipfs.io',
      'robotos.mypinata.cloud',
      'nftstorage.link',
      'cf-ipfs.com',
      'd2lp2vbc3umjmr.cloudfront.net'
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    return config
  },
}

module.exports = nextConfig