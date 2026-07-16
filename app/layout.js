import "./globals.css";

export const metadata = {
  title: "Logoped — ish kabineti",
  description: "Logoped uchun mijozlar, qabullar, topshiriqlar va hisobot ilovasi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
