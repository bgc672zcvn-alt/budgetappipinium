import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FortnoxHistoricalData {
  id: string;
  company: string;
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  personnel: number;
  marketing: number;
  office: number;
  other_opex: number;
  created_at: string;
  updated_at: string;
}

export const useFortnoxData = (company: string, year: number) => {
  return useQuery({
    queryKey: ['fortnox-historical', company, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fortnox_historical_data')
        .select('*')
        .eq('company', company)
        .eq('year', year)
        .order('month', { ascending: true });

      if (error) throw error;
      return data as FortnoxHistoricalData[];
    },
  });
};

export const useSyncFortnoxData = () => {
  const syncData = async (company?: string, year?: number) => {
    const { data, error } = await supabase.functions.invoke('fortnox-sync', {
      body: { company, year },
    });
    
    if (error) {
      console.error('Error syncing Fortnox data:', error);
      throw error;
    }
    
    return data;
  };

  return { syncData };
};

export const useFortnoxAvailableYears = (company: string) => {
  return useQuery({
    queryKey: ['fortnox-years', company],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fortnox_historical_data')
        .select('year')
        .eq('company', company)
        .order('year', { ascending: false });

      if (error) throw error;

      const years = Array.from(new Set((data as { year: number }[]).map(d => Number(d.year)))).sort((a, b) => b - a);
      return years;
    },
  });
};
