import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ImportJob {
  id: string;
  user_id: string;
  company: string;
  start_year: number;
  end_year: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  stats: {
    rateLimitHits?: number;
    totalRetries?: number;
    totalApiCalls?: number;
    totalVouchers?: number;
    totalMonthsImported?: number;
    yearStats?: Record<number, { months: number; vouchers: number }>;
  };
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export const useImportJob = (jobId: string | null) => {
  return useQuery({
    queryKey: ['import-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from('fortnox_import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data as ImportJob;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll every 3 seconds if job is running
      if (query.state.data?.status === 'running' || query.state.data?.status === 'queued') {
        return 3000;
      }
      return false;
    },
  });
};

export const useStartFullImport = () => {
  const startImport = async (company: string, startYear: number, endYear: number) => {
    const { data, error } = await supabase.functions.invoke('fortnox-import-range', {
      body: { company, startYear, endYear },
    });
    
    if (error) {
      console.error('Error starting full import:', error);
      throw error;
    }
    
    return data;
  };

  return { startImport };
};