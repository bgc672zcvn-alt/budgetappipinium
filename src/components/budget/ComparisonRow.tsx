import { TableRow, TableCell } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ComparisonRowProps {
  label: string;
  currentYearData: number[];
  previousYearData: number[];
  formatValue: (value: number) => string;
  isPercentage?: boolean;
}

export const ComparisonRow = ({
  label,
  currentYearData,
  previousYearData,
  formatValue,
  isPercentage = false,
}: ComparisonRowProps) => {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (change: number) => {
    if (Math.abs(change) < 0.1) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    return <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const getTrendColor = (change: number) => {
    if (Math.abs(change) < 0.1) return "text-muted-foreground";
    if (change > 0) return "text-green-600";
    return "text-red-600";
  };

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="font-medium text-muted-foreground text-xs">
        {label}
      </TableCell>
      {previousYearData.map((prevValue, index) => {
        const currentValue = currentYearData[index];
        const change = calculateChange(currentValue, prevValue);
        
        return (
          <TableCell key={index} className="text-right">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {formatValue(prevValue)}
              </span>
              <div className={`flex items-center gap-1 justify-end text-xs ${getTrendColor(change)}`}>
                {getTrendIcon(change)}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            </div>
          </TableCell>
        );
      })}
      <TableCell className="text-right">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {formatValue(previousYearData.reduce((sum, val) => sum + val, 0))}
          </span>
          <div className={`flex items-center gap-1 justify-end text-xs ${getTrendColor(
            calculateChange(
              currentYearData.reduce((sum, val) => sum + val, 0),
              previousYearData.reduce((sum, val) => sum + val, 0)
            )
          )}`}>
            {getTrendIcon(
              calculateChange(
                currentYearData.reduce((sum, val) => sum + val, 0),
                previousYearData.reduce((sum, val) => sum + val, 0)
              )
            )}
            <span>
              {Math.abs(
                calculateChange(
                  currentYearData.reduce((sum, val) => sum + val, 0),
                  previousYearData.reduce((sum, val) => sum + val, 0)
                )
              ).toFixed(1)}%
            </span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};
