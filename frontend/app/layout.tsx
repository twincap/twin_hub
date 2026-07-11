import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Twin Hub",
  title: {
    default: "Twin Hub",
    template: "%s | Twin Hub"
  },
  description: "미디어와 문서 작업을 위한 유틸 모음입니다."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
