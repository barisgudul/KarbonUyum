// frontend/hooks/useFacilities.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Hook: Tesisleri çek (önbellekten optimize et)
export function useFacilities(companyId) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['company', companyId, 'facilities'],
    queryFn: () => {
      // Önce 'user', 'companies' anahtarındaki önbellek verisini kontrol et
      const companiesData = queryClient.getQueryData(['user', 'companies']);
      if (companiesData) {
        const company = companiesData.find(c => c.id === companyId);
        if (company) {
          // Veri önbellekte varsa, API isteği yapmadan doğrudan döndür.
          return company.facilities || [];
        }
      }
      // Önbellekte veri yoksa (nadiren olmalı), API'ye istek gönder.
      return api.get(`/companies/${companyId}/`).then(res => res.data.facilities || []);
    },
    enabled: !!companyId,
  });
}

// Hook: Belirli bir tesis detaylarını çek
export function useFacility(facilityId) {
  return useQuery({
    queryKey: ['facility', facilityId],
    queryFn: async () => {
      const { data } = await api.get(`/facilities/${facilityId}/`);
      return data;
    },
    enabled: !!facilityId,
  });
}

// Hook: Tesis oluştur (OPTIMISTIC UPDATE - FLİCKER'ı ÖNLE)
export function useCreateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }) => api.post(`/companies/${companyId}/facilities/`, data),
    
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });
      await queryClient.cancelQueries({ queryKey: ['company', variables.companyId, 'facilities'] });

      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      const optimisticFacility = { 
        id: `temp-${Date.now()}`, 
        ...variables.data,
        activity_data: [],
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(company => {
          if (company.id === variables.companyId) {
            return {
              ...company,
              facilities: [...(company.facilities || []), optimisticFacility],
            };
          }
          return company;
        });
      });

      return { previousCompaniesData, optimisticFacility };
    },

    // SEAMLESS: Geçici veriyi sunucudan gelen gerçek veri ile değiştir (flicker yok!)
    onSuccess: (realData, variables, context) => {
      toast.success('Tesis başarıyla oluşturuldu!');

      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(company => {
          if (company.id === variables.companyId) {
            return {
              ...company,
              facilities: company.facilities?.map(f =>
                f.id === context.optimisticFacility.id ? realData.data : f
              ) || [realData.data],
            };
          }
          return company;
        });
      });
    },

    onError: (err, variables, context) => {
      toast.error('Tesis oluşturulamadı. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    // Flicker risk yok, fazladan fetch yok
    onSettled: () => {
      // No need to invalidate - already synced in onSuccess
    },
  });
}

// Hook: Tesis güncelle (SEAMLESS)
export function useUpdateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }) => api.put(`/facilities/${facilityId}`, data),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });

      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;

        return oldData.map(company => ({
          ...company,
          facilities: company.facilities?.map(f => {
            if (f.id === variables.facilityId) {
              return { ...f, ...variables.data };
            }
            return f;
          }) || [],
        }));
      });

      return { previousCompaniesData };
    },

    onSuccess: (realData, variables, context) => {
      toast.success('Tesis başarıyla güncellendi!');

      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;

        return oldData.map(company => ({
          ...company,
          facilities: company.facilities?.map(f =>
            f.id === variables.facilityId ? realData.data : f
          ) || [],
        }));
      });
    },

    onError: (err, variables, context) => {
      toast.error('Tesis güncellenemedi. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    onSettled: () => {
      // Already synced
    },
  });
}

// Hook: Tesis sil (OPTIMISTIC UPDATE - KRITIK)
export function useDeleteFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (facilityId) => api.delete(`/facilities/${facilityId}`),

    onMutate: async (facilityIdToDelete) => {
      // Devam eden sorguları iptal et
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });

      // Yedeği al
      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      // OPTIMISTIC: Tesis'i anında kaldır
      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(company => ({
          ...company,
          facilities: company.facilities?.filter(f => f.id !== facilityIdToDelete) || [],
        }));
      });

      return { previousCompaniesData };
    },

    onError: (err, variables, context) => {
      toast.error('Tesis silinemedi. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      queryClient.removeQueries({ queryKey: ['facility'] });
    },

    onSuccess: () => {
      toast.success('Tesis başarıyla silindi!');
    },
  });
}

// Hook: CSV yükle (Targeted invalidation)
// ⬆️ MOVED TO: hooks/useActivityData.js
