import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FortnoxConnectionStatus {
  isConnected: boolean;
  lastSync?: string;
  company?: string;
}

export const useFortnoxConnection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Listen for popup callback message to refresh status instantly
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event?.data?.type === 'fortnox_connected') {
        toast({ title: 'Ansluten!', description: 'Fortnox har anslutits' });
        setTimeout(() => window.location.reload(), 500);
      }
      if (event?.data?.type === 'fortnox_error') {
        toast({ title: 'Fel', description: 'Kunde inte ansluta till Fortnox', variant: 'destructive' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [toast]);

  // Fallback: Check URL params for callback success (if popup was blocked)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fortnox_connected') === 'true') {
      const company = params.get('company');
      toast({ title: 'Ansluten!', description: `Fortnox ansluten för ${company || 'företaget'}` });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => window.location.reload(), 500);
    }
  }, [toast]);

  const checkConnection = useCallback(async (company: string): Promise<FortnoxConnectionStatus> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isConnected: false };
      }

      const { data, error } = await supabase
        .from('fortnox_tokens')
        .select('company, updated_at, expires_at')
        .eq('company', company)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking connection:', error);
        return { isConnected: false };
      }

      if (!data) {
        return { isConnected: false };
      }

      // Check if token is expired
      const expiresAt = new Date(data.expires_at);
      const isExpired = expiresAt < new Date();

      return {
        isConnected: !isExpired,
        lastSync: data.updated_at,
        company: data.company,
      };
    } catch (error) {
      console.error('Error in checkConnection:', error);
      return { isConnected: false };
    }
  }, []);

  const initiateAuth = useCallback(async (company: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('fortnox-auth', {
        body: { company }
      });

      if (error) {
        throw error;
      }

      if (!data?.authUrl) {
        throw new Error('No auth URL returned');
      }

      // Open OAuth flow in popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.authUrl,
        'Fortnox OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast({
          title: 'Popup blockerad',
          description: 'Tillåt popups för att ansluta till Fortnox',
          variant: 'destructive',
        });
        return;
      }

      // Listen for OAuth completion
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsLoading(false);
          // Refresh page to show updated connection status
          window.location.reload();
        }
      }, 1000);

    } catch (error) {
      console.error('Error initiating auth:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte starta Fortnox-anslutning',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [toast]);

  const disconnect = useCallback(async (company: string) => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('fortnox_tokens')
        .delete()
        .eq('company', company)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Frånkopplad',
        description: `Fortnox-anslutning för ${company} har tagits bort`,
      });

      return true;
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte koppla från Fortnox',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    checkConnection,
    initiateAuth,
    disconnect,
    isLoading,
  };
};
