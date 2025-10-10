import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ImportJob } from "@/hooks/useImportJobs";

interface ImportStatusPanelProps {
  job: ImportJob | null;
}

export const ImportStatusPanel = ({ job }: ImportStatusPanelProps) => {
  if (!job) return null;

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
        </div>
      </div>

      <Progress value={job.progress} className="mb-3" />

      {job.stats && (
        <div className="text-sm space-y-1 text-muted-foreground">
          {job.stats.totalVouchers !== undefined && (
            <p>Verifikat: {job.stats.totalVouchers}</p>
          )}
          {job.stats.totalMonthsImported !== undefined && (
            <p>Månader med data: {job.stats.totalMonthsImported}</p>
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