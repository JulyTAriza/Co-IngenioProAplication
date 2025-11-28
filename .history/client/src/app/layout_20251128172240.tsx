"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";
import DashboardWrapper from "./dashboardWrapper";
import { Provider } from "react-redux";
import { metadata } from "./metadata";
import store from "./import"; // aquí ahora apunta a tu Import.tsx

const inter = Inter({ subsets: ["latin"] });
export { metadata };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = 
    pathname === "/login" || 
    pathname === "/register" || 
    pathname === "/forgot" || 
    pathname === "/verification" || 
    pathname === "/new-password";

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
