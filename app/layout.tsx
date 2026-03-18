import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoxedJuice.ai — AI Job Fit Analyzer",
  description:
    "Instantly analyze how well your resume matches any job posting. Powered by Claude AI.",
  openGraph: {
    title: "BoxedJuice.ai — AI Job Fit Analyzer",
    description:
      "Instantly analyze how well your resume matches any job posting.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
