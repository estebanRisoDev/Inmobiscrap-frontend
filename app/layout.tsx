import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
// Nota: usa v16-appRouter para Next.js 16

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AppRouterCacheProvider>
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}