import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { ImportJob } from "@/hooks/useImportJobs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface ImportStatusPanelProps {
  job: ImportJob | null;
}

export const ImportStatusPanel = ({ job }: ImportStatusPanelProps) => {
  if (!job) return null;

  const updatedAt = new Date(job.updated_at);
  const minutesSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / 60000);
  const isStalled = (job.status === 'running' || job.status === 'queued') && minutesSinceUpdate > 5;

  const handleCancel = async () => {
    const { error } = await supabase
      .from('fortnox_import_jobs')
      .update({ 
        status: 'failed', 
        last_error: 'Avbruten av användare',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (error) {
      toast.error('Kunde inte avbryta importen');
    } else {
      toast.success('Import avbruten');
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'succeeded':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'queued':
        return 'I kö...';
      case 'running':
        return 'Importerar...';
      case 'succeeded':
        return 'Slutförd!';
      case 'failed':
        return 'Misslyckades';
    }
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-semibold">
            Fullständig import ({job.start_year}–{job.end_year})
          </h3>
          <p className="text-sm text-muted-foreground">{getStatusText()}</p>
          {job.stats?.currentMonth && (
            <p className="text-sm text-muted-foreground">
              Aktuell månad: {job.stats.currentMonth}
            </p>
          )}
        </div>
        {(job.status === 'running' || job.status === 'queued') && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancel}
          >
            Avbryt
          </Button>
        )}
      </div>

      <Progress value={job.progress} className="mb-3" />

      {isStalled && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-600">
            Varning: Ingen uppdatering på {minutesSinceUpdate} minuter
          </p>
        </div>
      )}

      {job.stats && (
        <div className="text-sm space-y-1 text-muted-foreground">
          <p className="text-xs">
            Senast uppdaterad: {formatDistanceToNow(updatedAt, { addSuffix: true, locale: sv })}
          </p>
          {job.stats.totalVouchers !== undefined && (
            <p>Verifikat: {job.stats.totalVouchers}</p>
          )}
          {job.stats.totalMonthsImported !== undefined && (
            <p>Månader med data: {job.stats.totalMonthsImported}</p>
          )}
          {job.stats.processedMonths && job.stats.processedMonths.length > 0 && (
            <p>Senaste månad: {job.stats.processedMonths[job.stats.processedMonths.length - 1]}</p>
          )}
          {job.stats.rateLimitHits !== undefined && job.stats.rateLimitHits > 0 && (
            <p className="text-yellow-600">429-fel: {job.stats.rateLimitHits}</p>
          )}
        </div>
      )}

      {job.status === 'failed' && job.last_error && (
        <p className="text-sm text-red-600 mt-2">{job.last_error}</p>
      )}
    </Card>
  );
};