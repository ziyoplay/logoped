import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
});

export const metadata = {
  title: "Logoped — ish kabineti",
  description: "Logoped uchun mijozlar, qabullar, topshiriqlar va hisobot ilovasi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
