import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw } from "lucide-react";
import { useBudgetHistory } from "@/hooks/useBudgetHistory";
import { BudgetData } from "@/types/budget";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VersionHistoryProps {
  company: string;
  onRestore: (data: BudgetData) => void;
}

export const VersionHistory = ({ company, onRestore }: VersionHistoryProps) => {
  const { history, isAdmin, loadVersions, restoreVersion } = useBudgetHistory();

  useEffect(() => {
    loadVersions(company);
  }, [company, loadVersions]);

  const handleRestore = async (versionId: string) => {
    const restoredData = await restoreVersion(versionId);
    if (restoredData) {
      onRestore(restoredData);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Versionshistorik
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Versionshistorik - {company}</DialogTitle>
          <DialogDescription>
            Återställ till en tidigare version av budgeten
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inga sparade versioner finns ännu
              </p>
            ) : (
              history.map((version) => (
                <Card key={version.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {formatDate(version.created_at)}
                        </p>
                        {version.user_email && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {version.user_email}
                          </span>
                        )}
                      </div>
                      {version.version_note && (
                        <p className="text-xs text-muted-foreground">
                          {version.version_note}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRestore(version.id)}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="h-3 w-3 mr-2" />
                      Återställ
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
