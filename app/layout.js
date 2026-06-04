import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "CGL Core 3D | Interactive Revision Matrix",
  description: "Next-gen AI Image-to-Quiz ecosystem optimized for SSC CGL prep",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col antialiased selection:bg-cyan-500/20 selection:text-cyan-400">
        
        {/* Subtle decorative background scanning line mesh */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Main Content Node */}
        <main className="relative z-10 flex-grow flex flex-col">
          {children}
        </main>

      </body>
    </html>
  );
}