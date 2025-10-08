import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface PasswordProtectionProps {
  children: React.ReactNode;
}

const DEFAULT_PASSWORD = "budget2025";

export const PasswordProtection = ({ children }: PasswordProtectionProps) => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("budget_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === DEFAULT_PASSWORD) {
      sessionStorage.setItem("budget_auth", "true");
      setIsAuthenticated(true);
      toast.success("Välkommen!");
    } else {
      toast.error("Felaktigt lösenord");
      setPassword("");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Budget Dashboard</CardTitle>
          <CardDescription>
            Ange lösenord för att fortsätta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Lösenord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Lås upp
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Standardlösenord: budget2025
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
