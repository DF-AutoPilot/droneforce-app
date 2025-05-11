import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/wallet-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "DroneForce Protocol",
  description: "Decentralized drone task management on Solana",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-950 text-white min-h-screen`}>
        <WalletContextProvider>
          {children}
          <Toaster />
        </WalletContextProvider>
      </body>
    </html>
  );
}
