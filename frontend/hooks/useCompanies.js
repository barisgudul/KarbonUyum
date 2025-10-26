// frontend/hooks/useCompanies.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Hook: Tüm şirketleri ve ilişkili verileri çek
export function useCompanies() {
  return useQuery({
    queryKey: ['user', 'companies'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/');
      return data.companies || [];
    },
  });
}

// Hook: Belirli bir şirketin detaylarını çek
export function useCompany(companyId) {
  return useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${companyId}/`);
      return data;
    },
    enabled: !!companyId,
  });
}

// Hook: Yeni şirket oluştur (OPTIMISTIC UPDATE)
export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyData) => api.post('/companies/', companyData),
    
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });

      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      // Optimistic: Şirketi ekle
      const optimisticCompany = {
        id: `temp-${Date.now()}`,
        ...variables,
        facilities: [],
        members: [],
      };

      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return [optimisticCompany];
        return [...oldData, optimisticCompany];
      });

      return { previousCompaniesData };
    },

    onError: (error, variables, context) => {
      toast.error('Şirket oluşturulamadı. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
    },

    onSuccess: () => {
      toast.success('Şirket başarıyla oluşturuldu!');
    },
  });
}

// Hook: Şirket güncelle (OPTIMISTIC UPDATE)
export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }) => api.put(`/companies/${companyId}`, data),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });

      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      // Optimistic: Şirketi güncelle
      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(c =>
          c.id === variables.companyId
            ? { ...c, ...variables.data }
            : c
        );
      });

      return { previousCompaniesData };
    },

    onError: (error, variables, context) => {
      toast.error('Şirket güncellenemedi. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },

    onSuccess: () => {
      toast.success('Şirket başarıyla güncellendi!');
    },
  });
}

// Hook: Şirket sil (OPTIMISTIC UPDATE)
export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId) => api.delete(`/companies/${companyId}`),

    onMutate: async (companyIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });

      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      // OPTIMISTIC: Şirketi anında kaldır
      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(c => c.id !== companyIdToDelete);
      });

      return { previousCompaniesData };
    },

    onError: (error, variables, context) => {
      toast.error('Şirket silinemedi. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      queryClient.removeQueries({ queryKey: ['company'] });
    },

    onSuccess: () => {
      toast.success('Şirket başarıyla silindi!');
    },
  });
}

// Hook: Şirket üyeleri
export function useCompanyMembers(companyId) {
  return useQuery({
    queryKey: ['company', companyId, 'members'],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${companyId}/members`);
      return data;
    },
    enabled: !!companyId,
  });
}

// Hook: Üye ekle
export function useAddCompanyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, email, role }) =>
      api.post(`/companies/${companyId}/members`, { email, role }),
    onSuccess: (response, variables) => {
      toast.success('Üye başarıyla eklendi!');
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId, 'members'] });
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Üye eklenemedi.');
    },
  });
}

// Hook: Tesisler
export function useFacilities(companyId) {
  return useQuery({
    queryKey: ['company', companyId, 'facilities'],
    queryFn: async () => {
      // Şirket verilerinden tesisleri al
      const { data } = await api.get('/users/me/');
      const company = data.companies?.find(c => c.id === companyId);
      return company?.facilities || [];
    },
    enabled: !!companyId,
  });
}

// Hook: Yeni tesis oluştur
export function useCreateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }) =>
      api.post(`/companies/${companyId}/facilities/`, data),
    onSuccess: (response, variables) => {
      toast.success('Tesis başarıyla oluşturuldu!');
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId, 'facilities'] });
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Tesis oluşturulamadı.');
    },
  });
}

// Hook: Aktivite verisi oluştur
export function useCreateActivityData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }) =>
      api.post(`/facilities/${facilityId}/activity-data/`, data),
    onSuccess: (response) => {
      toast.success('Aktivite verisi başarıyla kaydedildi!');
      // Tüm ilişkili verileri yenile
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      return response.data;
    },
  });
}

// Hook: CSV yükle
export function useUploadCSV() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/facilities/${facilityId}/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (response) => {
      const result = response.data;
      if (result.successful_rows > 0) {
        toast.success(`${result.successful_rows} satır başarıyla yüklendi!`);
        // Tüm verileri yenile
        queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      }
      if (result.failed_rows > 0) {
        toast.error(`${result.failed_rows} satırda hata oluştu.`);
      }
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'CSV yükleme başarısız.');
    },
  });
}

// Hook: Finansal veriler
export function useCompanyFinancials(companyId) {
  return useQuery({
    queryKey: ['company', companyId, 'financials'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/');
      const company = data.companies?.find(c => c.id === companyId);
      return company?.financials || null;
    },
    enabled: !!companyId,
  });
}

// Hook: Finansal verileri güncelle
export function useUpdateFinancials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }) =>
      api.put(`/companies/${companyId}/financials`, data),
    onSuccess: (response, variables) => {
      toast.success('Finansal veriler başarıyla güncellendi!');
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId, 'financials'] });
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Finansal veriler güncellenemedi.');
    },
  });
}

// Hook: Öneriler
export function useSuggestions(companyId) {
  return useQuery({
    queryKey: ['company', companyId, 'suggestions'],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${companyId}/suggestions`);
      return data;
    },
    enabled: !!companyId,
  });
}

// Hook: Benchmarking raporu
export function useBenchmarkReport(companyId) {
  return useQuery({
    queryKey: ['company', companyId, 'benchmark'],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${companyId}/benchmark-report`);
      return data;
    },
    enabled: !!companyId,
  });
}

// Hook: Dashboard özeti
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary');
      return data;
    },
  });
}
