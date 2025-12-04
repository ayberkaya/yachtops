import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YachtOps - Yacht Operations Management',
    short_name: 'YachtOps',
    description: 'Complete yacht operations management system',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['business', 'productivity'],
    shortcuts: [
      {
        name: 'Expenses',
        short_name: 'Expenses',
        description: 'View and manage expenses',
        url: '/dashboard/expenses',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Tasks',
        short_name: 'Tasks',
        description: 'View and manage tasks',
        url: '/dashboard/tasks',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}

