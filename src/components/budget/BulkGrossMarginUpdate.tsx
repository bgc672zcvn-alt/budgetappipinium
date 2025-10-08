import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface BulkGrossMarginUpdateProps {
  onUpdate: (newMargin: number) => void;
}

export const BulkGrossMarginUpdate = ({ onUpdate }: BulkGrossMarginUpdateProps) => {
  const [marginValue, setMarginValue] = useState<string>("");

  const handleUpdate = () => {
    const value = parseFloat(marginValue);
    if (isNaN(value) || value < 0 || value > 100) {
      return;
    }
    onUpdate(value);
    setMarginValue("");
  };

  return (
    <Card className="p-4 bg-accent/5 border-accent/20">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="bulk-margin" className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Uppdatera bruttovinst % för alla månader
          </Label>
          <div className="flex gap-2">
            <Input
              id="bulk-margin"
              type="number"
              placeholder="ex. 45.5"
              value={marginValue}
              onChange={(e) => setMarginValue(e.target.value)}
              min="0"
              max="100"
              step="0.1"
              className="w-32"
            />
            <span className="flex items-center text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <Button
          onClick={handleUpdate}
          disabled={!marginValue}
          variant="default"
          size="sm"
        >
          Applicera på alla månader
        </Button>
      </div>
    </Card>
  );
};
