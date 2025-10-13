// frontend/app/layout.js
import { AuthProvider } from '../context/AuthContext';
import './globals.css';

// Tailwind CSS için bu satırları ekleyebilirsin
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'KarbonUyum',
  description: 'Karbon Ayak İzi Yönetim Platformu',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}