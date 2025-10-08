import { useState, useCallback } from "react";
import { BudgetData } from "@/types/budget";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BudgetVersion {
  id: string;
  company: string;
  data: BudgetData;
  created_by: string;
  created_at: string;
  version_note?: string;
}

export const useBudgetHistory = () => {
  const [history, setHistory] = useState<BudgetVersion[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      const adminStatus = !!data;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }, []);

  const saveVersion = useCallback(async (company: string, data: BudgetData, note?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("budget_versions").insert({
        company,
        data: data as any,
        created_by: user.id,
        version_note: note,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving version:", error);
    }
  }, []);

  const loadVersions = useCallback(async (company: string) => {
    try {
      const admin = await checkAdminStatus();
      if (!admin) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from("budget_versions")
        .select("*")
        .eq("company", company)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory((data || []) as unknown as BudgetVersion[]);
    } catch (error) {
      console.error("Error loading versions:", error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda versionshistorik.",
        variant: "destructive",
      });
    }
  }, [checkAdminStatus, toast]);

  const restoreVersion = useCallback(async (versionId: string): Promise<BudgetData | null> => {
    try {
      const { data, error } = await supabase
        .from("budget_versions")
        .select("data")
        .eq("id", versionId)
        .single();

      if (error) throw error;

      toast({
        title: "Version återställd",
        description: "Budgeten har återställts till den valda versionen.",
      });

      return data.data as unknown as BudgetData;
    } catch (error) {
      console.error("Error restoring version:", error);
      toast({
        title: "Fel",
        description: "Kunde inte återställa versionen.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  return {
    history,
    isAdmin,
    checkAdminStatus,
    saveVersion,
    loadVersions,
    restoreVersion,
  };
};
