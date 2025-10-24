// frontend/hooks/useOptimisticMutation.ts
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/**
 * Optimistic update mantığını merkezileştiren genel-amaçlı hook.
 * Tekrarlanan kodu ortadan kaldırır ve gelecekteki değişiklikleri tek yerden yönetir.
 * 
 * @param config.queryKey - Geçersiz kılınacak ana query key'i
 * @param config.mutationFn - API isteğini yapan fonksiyon
 * @param config.updateCache - Önbelleği optimistic olarak güncelleyen fonksiyon
 * @param config.syncCache - Sunucudan gelen veriyle senkronize eden fonksiyon (optional)
 * @param config.successMessage - Başarı mesajı (default: "İşlem başarılı!")
 * @param config.errorMessage - Hata mesajı (default: "İşlem başarısız, değişiklikler geri alınıyor.")
 */
interface UseOptimisticMutationConfig<TVariables, TResponse> {
  queryKey: Array<string | number>;
  mutationFn: (variables: TVariables) => Promise<{ data: TResponse }>;
  updateCache: (
    oldData: any,
    variables: TVariables
  ) => { newData: any; context: any };
  syncCache?: (
    oldData: any,
    realData: TResponse,
    variables: TVariables,
    context: any
  ) => any;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TResponse) => void;
}

export function useOptimisticMutation<TVariables, TResponse>({
  queryKey,
  mutationFn,
  updateCache,
  syncCache,
  successMessage = 'İşlem başarılı!',
  errorMessage = 'İşlem başarısız, değişiklikler geri alınıyor.',
  onSuccess: onSuccessCallback,
}: UseOptimisticMutationConfig<TVariables, TResponse>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      // Devam eden sorguları iptal et
      await queryClient.cancelQueries({ queryKey });

      // Önceki veriyi yedekle
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistic update yapılacak veriyi hazırla
      const { newData, context } = updateCache(previousData, variables);

      // Önbelleği anında güncelle
      queryClient.setQueryData(queryKey, newData);

      // Context'te bilgi sakla (hatada geri dönmek için)
      return { previousData, optimisticContext: context };
    },

    onSuccess: (response, variables, context) => {
      toast.success(successMessage);

      // Geçici veriyi sunucudan gelen gerçek veriyle senkronize et
      if (syncCache) {
        const finalData = syncCache(
          queryClient.getQueryData(queryKey),
          response.data,
          variables,
          context.optimisticContext
        );
        queryClient.setQueryData(queryKey, finalData);
      }

      // Callback çağır (opsiyonel)
      onSuccessCallback?.(response.data);
    },

    onError: (err, variables, context) => {
      toast.error(errorMessage);

      // Hata durumunda önceki veriyi geri dön
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Veri tutarlılığını garanti etmek için senkronize et
      // (genellikle gerekli değil, ama extra güvenlik için)
      // queryClient.invalidateQueries({ queryKey });
    },
  });
}
