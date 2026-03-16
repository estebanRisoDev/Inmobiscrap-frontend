// app/layout.tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/binoculars.png" type="image/png" />
        {/* Google Fonts para las páginas de auth */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppRouterCacheProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}