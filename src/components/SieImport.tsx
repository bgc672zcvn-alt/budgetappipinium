import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SieImportProps {
  company: string;
  onImportComplete?: () => void;
}

export const SieImport = ({ company, onImportComplete }: SieImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.toLowerCase().endsWith('.se') && !selectedFile.name.toLowerCase().endsWith('.si')) {
        toast({
          title: 'Fel filtyp',
          description: 'Välj en SIE-fil (.se eller .si)',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus('uploading');
    setMessage('Läser SIE-fil...');

    try {
      // Read file content
      const fileContent = await file.text();

      // Send to edge function for processing
      const { data, error } = await supabase.functions.invoke('sie-import', {
        body: { 
          company,
          sieContent: fileContent,
        },
      });

      if (error) throw error;

      setStatus('success');
      setMessage(`Import klar! ${data.monthsImported} månader importerade.`);
      toast({
        title: 'Import slutförd',
        description: `${data.monthsImported} månader har importerats från SIE-filen`,
      });
      
      onImportComplete?.();
    } catch (err) {
      console.error('SIE import error:', err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Något gick fel vid import');
      toast({
        title: 'Import misslyckades',
        description: 'Kontrollera att SIE-filen är korrekt formaterad',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Importera från SIE-fil</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ladda upp en SIE-fil exporterad från Fortnox (Arkiv → Exportera SIE-fil)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex-1">
            <input
              type="file"
              accept=".se,.si"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
              disabled={isUploading}
            >
              <FileText className="h-4 w-4 mr-2" />
              {file ? file.name : 'Välj SIE-fil...'}
            </Button>
          </label>

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Importera
          </Button>
        </div>

        {status !== 'idle' && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted">
            {status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-0.5" />}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Exportera SIE-fil från Fortnox: Arkiv → Exportera → SIE-fil (typ 4)</p>
          <p>• Välj rätt räkenskapsår ochperioder</p>
          <p>• Systemet mappar automatiskt konton till rätt kategorier</p>
        </div>
      </div>
    </Card>
  );
};
