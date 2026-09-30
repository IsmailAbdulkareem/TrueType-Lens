import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrueType Lens - Realistic Image Text Editor',
  description: 'Seamlessly edit text on any photo or graphic with automatic color matching, font detection, perspective alignment, authentic grain blending, and natural background healing.',
  openGraph: {
    title: 'TrueType Lens - Realistic Image Text Editor',
    description: 'Seamlessly edit text on any photo or graphic with automatic color matching, font detection, perspective alignment, authentic grain blending, and natural background healing.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrueType Lens - Realistic Image Text Editor',
    description: 'Seamlessly edit text on any photo or graphic with automatic color matching, font detection, perspective alignment, authentic grain blending, and natural background healing.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Caveat:wght@600;700&family=Courier+Prime:wght@400;700&family=Inter:wght@300;400;500;600;700;800;900&family=Montserrat:wght@400;600;700;800;900&family=Oswald:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Roboto+Mono:wght@400;600;700&family=Rubik:wght@500;700;900&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
