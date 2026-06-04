import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "CGL Core | AI-Powered Exam Revision Platform",
  description: "Transform handwritten notes into TCS-pattern mock exams with AI vision. SSC CGL preparation reimagined with glassmorphic design.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col antialiased selection:bg-indigo-400/20 selection:text-indigo-200">
        
        {/* Ambient plasma glow blobs — floating gradient orbs behind glass panels */}
        <div className="ambient-blob blob-1" aria-hidden="true" />
        <div className="ambient-blob blob-2" aria-hidden="true" />
        <div className="ambient-blob blob-3" aria-hidden="true" />

        {/* Subtle dot grid texture overlay */}
        <div 
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
          aria-hidden="true"
        />
        
        {/* Main Content */}
        <main className="relative z-10 flex-grow flex flex-col">
          {children}
        </main>

      </body>
    </html>
  );
}