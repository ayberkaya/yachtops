import { MetadataRoute } from 'next'

// Cache-busting version for icons - increment this when icons are updated
const ICON_VERSION = 'v2'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HelmOps - Helm Operations Management',
    short_name: 'HelmOps',
    description: 'Complete helm operations management system',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    orientation: 'portrait-primary',
    icons: [
      {
        src: `/icon-192.png?v=${ICON_VERSION}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `/icon-512.png?v=${ICON_VERSION}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'productivity'],
    shortcuts: [
      {
        name: 'Expenses',
        short_name: 'Expenses',
        description: 'View and manage expenses',
        url: '/dashboard/expenses',
        icons: [{ src: `/icon-192.png?v=${ICON_VERSION}`, sizes: '192x192' }],
      },
      {
        name: 'Tasks',
        short_name: 'Tasks',
        description: 'View and manage tasks',
        url: '/dashboard/tasks',
        icons: [{ src: `/icon-192.png?v=${ICON_VERSION}`, sizes: '192x192' }],
      },
    ],
  }
}

