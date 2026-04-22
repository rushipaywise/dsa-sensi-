import type {Metadata} from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono, Anonymous_Pro, Fira_Code } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const anonymousPro = Anonymous_Pro({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-anonymous',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira',
});

export const metadata: Metadata = {
  title: 'Sensei DSA: Manga Sketch Teacher',
  description: 'A hand-drawn, manga-style AI tutor that helps you solve Data Structures and Algorithms problems.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${anonymousPro.variable} ${firaCode.variable}`}>
      <body suppressHydrationWarning className="font-sans">{children}</body>
    </html>
  );
}
