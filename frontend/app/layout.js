// frontend/app/layout.js
import { AuthProvider } from '../context/AuthContext';
import Providers from './providers';
import './globals.css';
import { Toaster } from 'react-hot-toast';

import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'KarbonUyum',
  description: 'Karbon Ayak İzi Yönetim Platformu',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <AuthProvider>
          <Providers>
            {children}
            <Toaster position="bottom-right" />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}