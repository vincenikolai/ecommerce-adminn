import { ClerkProvider } from "@/components/clerk-provider";
import { Header } from "@/components/header";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "@/providers/modal-provider";
import { ToastProvider } from "@/providers/toast.provider";

import prismadb from "@/lib/prismadb";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ecommerce Admin",
  description: "Ecommerce Admin Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ToastProvider />
          <ModalProvider />

          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
