import { Header } from "@/components/header";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "@/providers/modal-provider";
import { ToastProvider } from "@/providers/toast.provider";
import { SupabaseProvider } from "@/providers/supabase-provider";

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
    <SupabaseProvider>
      <html lang="en">
        <body className={inter.className + " min-h-screen flex flex-col"}>
          <ToastProvider />
          <ModalProvider />

          <Header />
          <div className="flex-1">
            {children}
          </div>
        </body>
      </html>
    </SupabaseProvider>
  );
}
