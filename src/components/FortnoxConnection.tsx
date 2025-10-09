import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFortnoxConnection, FortnoxConnectionStatus } from '@/hooks/useFortnoxConnection';
import { CheckCircle2, XCircle, Loader2, Link as LinkIcon } from 'lucide-react';

interface FortnoxConnectionProps {
  company: string;
}

export const FortnoxConnection = ({ company }: FortnoxConnectionProps) => {
  const { checkConnection, initiateAuth, disconnect, isLoading } = useFortnoxConnection();
  const [status, setStatus] = useState<FortnoxConnectionStatus>({ isConnected: false });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      setChecking(true);
      const connectionStatus = await checkConnection(company);
      setStatus(connectionStatus);
      setChecking(false);
    };

    loadStatus();
  }, [company, checkConnection]);

  const handleConnect = async () => {
    await initiateAuth(company);
  };

  const handleDisconnect = async () => {
    const success = await disconnect(company);
    if (success) {
      setStatus({ isConnected: false });
    }
  };

  if (checking) {
    return (
      <Card className="p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Kontrollerar Fortnox-anslutning...</span>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status.isConnected ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Fortnox ansluten</p>
                {status.lastSync && (
                  <p className="text-xs text-muted-foreground">
                    Senast uppdaterad: {new Date(status.lastSync).toLocaleString('sv-SE')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Fortnox ej ansluten</p>
                <p className="text-xs text-muted-foreground">
                  Anslut för att synkronisera data automatiskt
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          {status.isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Koppla från
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              Anslut Fortnox
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
