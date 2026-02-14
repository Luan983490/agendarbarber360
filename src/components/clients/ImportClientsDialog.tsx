import { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: { line: number; name: string; error: string }[];
  total_processed: number;
  error_count: number;
}

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    clients: {
      name: string;
      phone: string;
      email: string;
      notes?: string | null;
      tags?: string[];
      line_number: number;
    }[]
  ) => Promise<ImportResult | null>;
}

export function ImportClientsDialog({
  open,
  onOpenChange,
  onImport,
}: ImportClientsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const downloadTemplate = () => {
    const template = 'Nome,Telefone,Email,Notas,Tags\nJoão Silva,51999887766,joao@email.com,Cliente fiel,"VIP,Regular"\nMaria Santos,51988776655,maria@email.com,,Regular\n';
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_clientes.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        setPreview(results.data.slice(0, 5));
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        const clients = results.data.map((row: any, index: number) => ({
          name: row['Nome'] || row['name'] || row['nome'] || '',
          phone: row['Telefone'] || row['phone'] || row['telefone'] || '',
          email: row['Email'] || row['email'] || '',
          notes: row['Notas'] || row['notes'] || row['notas'] || null,
          tags: (row['Tags'] || row['tags'] || '')
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean),
          line_number: index + 2,
        }));

        const importResult = await onImport(clients);
        setResult(importResult);
        setImporting(false);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt'))) {
      handleFile(droppedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Clientes via CSV
          </DialogTitle>
        </DialogHeader>

        {result ? (
          /* Result view */
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-lg font-medium">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Importação Concluída
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{result.total_processed}</p>
                <p className="text-xs text-muted-foreground">Total processado</p>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-500">
                  {result.inserted}
                </p>
                <p className="text-xs text-muted-foreground">Inseridos</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">
                  {result.updated}
                </p>
                <p className="text-xs text-muted-foreground">Atualizados</p>
              </div>
              <div className="bg-destructive/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-destructive">
                  {result.error_count}
                </p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Linhas com erro:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      className="text-xs bg-destructive/10 rounded p-2 text-destructive"
                    >
                      Linha {err.line}: {err.name} — {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          /* Upload view */
          <div className="space-y-4 py-2">
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Arraste seu arquivo CSV aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ou clique para selecionar
                  </p>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Formato: .csv
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {/* Template download */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Preview (primeiras {preview.length} linhas):
                </p>
                <div className="overflow-x-auto text-xs border border-border rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {Object.keys(preview[0]).map((key) => (
                          <th key={key} className="px-2 py-1 text-left font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-2 py-1 truncate max-w-[120px]">
                              {String(val || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rules */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs space-y-1">
                <p>• Nome, Telefone e Email são obrigatórios</p>
                <p>• Telefone duplicado = dados serão atualizados</p>
                <p>• Tags separadas por vírgula</p>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importing}
              >
                {importing ? 'Importando...' : 'Importar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
