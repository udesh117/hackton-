import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackOnX - India's Multi-State HPC Hackathon",
  description: "HackOnX is a multi-state offline hackathon bringing together India's smartest student builders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}


