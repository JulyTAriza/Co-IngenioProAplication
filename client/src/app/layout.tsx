"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";
import DashboardWrapper from "./dashboardWrapper";
import { Provider } from "react-redux";
import store from "./import"; // aquí ahora apunta a tu Import.tsx

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider store={store}>
          {isAuthPage ? (
            children
          ) : (
            <DashboardWrapper>{children}</DashboardWrapper>
          )}
        </Provider>
      </body>
    </html>
  );
}
