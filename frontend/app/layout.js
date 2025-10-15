// frontend/app/layout.js
import { AuthProvider } from '../context/AuthContext';
import './globals.css';
import { Toaster } from 'react-hot-toast'; // <-- YENİ: Import et

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
        <AuthProvider>
          {children}
          {/* YENİ: Toaster'ı buraya ekliyoruz. Bildirimler sağ altta görünecek. */}
          <Toaster position="bottom-right" />
        </AuthProvider>
      </body>
    </html>
  );
}