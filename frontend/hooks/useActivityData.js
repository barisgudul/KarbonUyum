// frontend/hooks/useActivityData.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Hook: Aktivite verileri
export function useActivityData(facilityId) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['facility', facilityId, 'activity-data'],
    queryFn: () => {
      const facilitiesData = queryClient.getQueryData(['user', 'companies']);
      if (facilitiesData) {
        for (const company of facilitiesData) {
          const facility = company.facilities?.find(f => f.id === facilityId);
          if (facility) {
            return facility.activity_data || [];
          }
        }
      }
      return api.get(`/facilities/${facilityId}/activity-data/`).then(res => res.data || []);
    },
    enabled: !!facilityId,
  });
}

// Hook: Aktivite verisi sil (OPTIMISTIC UPDATE)
export function useDeleteActivityData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activityId) => api.delete(`/activity-data/${activityId}`),

    onMutate: async (activityIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });

      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      // OPTIMISTIC: Aktiviteyi anında kaldır
      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;

        return oldData.map(company => ({
          ...company,
          facilities: company.facilities?.map(f => ({
            ...f,
            activity_data: f.activity_data?.filter(a => a.id !== activityIdToDelete) || [],
          })) || [],
        }));
      });

      return { previousCompaniesData };
    },

    onError: (err, variables, context) => {
      toast.error('Aktivite verisi silinemedi. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
    },

    onSuccess: () => {
      toast.success('Aktivite verisi başarıyla silindi!');
    },
  });
}

// Hook: Aktivite verisi oluştur (OPTIMISTIC UPDATE - FLİCKER'ı ÖNLE)
export function useCreateActivityData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }) => api.post(`/facilities/${facilityId}/activity-data/`, data),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'companies'] });

      const previousCompaniesData = queryClient.getQueryData(['user', 'companies']);

      // Optimistic: Aktiviteyi ekle
      const optimisticActivity = {
        id: `temp-${Date.now()}`,
        ...variables.data,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;

        return oldData.map(company => ({
          ...company,
          facilities: company.facilities?.map(f => {
            if (f.id === variables.facilityId) {
              return {
                ...f,
                activity_data: [...(f.activity_data || []), optimisticActivity],
              };
            }
            return f;
          }) || [],
        }));
      });

      return { previousCompaniesData, optimisticActivity };
    },

    // SEAMLESS: Geçici veriyi sunucudan gelen gerçek veri ile değiştir
    onSuccess: (realData, variables, context) => {
      toast.success('Aktivite verisi başarıyla kaydedildi!');

      queryClient.setQueryData(['user', 'companies'], (oldData) => {
        if (!oldData) return oldData;

        return oldData.map(company => ({
          ...company,
          facilities: company.facilities?.map(f => {
            if (f.id === variables.facilityId) {
              return {
                ...f,
                activity_data: f.activity_data?.map(a =>
                  a.id === context.optimisticActivity.id ? realData.data : a
                ) || [realData.data],
              };
            }
            return f;
          }) || [],
        }));
      });
    },

    onError: (err, variables, context) => {
      toast.error('Aktivite verisi kaydedilemedi. Değişiklikler geri alınıyor.');
      if (context?.previousCompaniesData) {
        queryClient.setQueryData(['user', 'companies'], context.previousCompaniesData);
      }
    },

    // Flicker risk yok, fazladan fetch yok
    onSettled: () => {
      // Optional: yine de senkronize etmek isterseniz
      // queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
    },
  });
}

// Hook: CSV yükle (Targeted invalidation)
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

    onSuccess: (response, variables) => {
      const result = response.data;

      if (result.successful_rows > 0) {
        toast.success(`${result.successful_rows} satır başarıyla yüklendi!`);
        queryClient.invalidateQueries({ queryKey: ['user', 'companies'] });
      }

      if (result.failed_rows > 0) {
        toast.error(`${result.failed_rows} satırda hata oluştu.`);
      }
    },

    onError: (error) => {
      toast.error(error.response?.data?.detail || 'CSV yükleme başarısız.');
    },
  });
}
