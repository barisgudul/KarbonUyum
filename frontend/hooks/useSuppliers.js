// frontend/hooks/useSuppliers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Hook: Davet detaylarını al (token ile)
export function useInvitationDetails(token) {
  return useQuery({
    queryKey: ['supplier', 'invitation', token],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/invitation/${token}`);
      return data;
    },
    enabled: !!token,
    retry: 1,
  });
}

// Hook: Tedarikçi onboarding (şifre belirleyerek kayıt ol)
export function useOnboardSupplier() {
  return useMutation({
    mutationFn: ({ token, password }) =>
      api.post('/suppliers/onboard', { token, password }),
    onSuccess: (response) => {
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      toast.success('Hesabınız başarıyla oluşturuldu!');
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Kayıt işlemi başarısız');
    },
  });
}

// Hook: Tedarikçinin ürünlerini listele
export function useSupplierProducts() {
  return useQuery({
    queryKey: ['supplier', 'products'],
    queryFn: async () => {
      const { data } = await api.get('/suppliers/my-products');
      return data.products || [];
    },
    staleTime: 30000, // 30 saniye
  });
}

// Hook: Yeni ürün ekle
export function useAddProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productData) =>
      api.post('/suppliers/my-products', productData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['supplier', 'products'] });
      toast.success('Ürün başarıyla eklendi!');
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Ürün eklenemedi');
    },
  });
}

// Hook: Ürün sil
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) =>
      api.delete(`/suppliers/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', 'products'] });
      toast.success('Ürün silindi!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Silme işlemi başarısız');
    },
  });
}

// Hook: Tedarikçi dashboard verisi (benchmark'lar dahil)
export function useSupplierDashboard() {
  return useQuery({
    queryKey: ['supplier', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/suppliers/me/dashboard');
      return data;
    },
    staleTime: 60000, // 1 dakika
  });
}

