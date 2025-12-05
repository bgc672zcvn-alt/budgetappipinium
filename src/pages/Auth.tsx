import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

const emailSchema = z.string().email("Ogiltig e-postadress");
const passwordSchema = z.string().min(6, "Lösenordet måste vara minst 6 tecken");

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate access code
      if (accessCode !== "iPi2018!") {
        toast({
          title: "Fel åtkomstkod",
          description: "Du måste ange rätt åtkomstkod för att skapa ett konto.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Validate inputs
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "E-postadressen används redan",
            description: "Försök logga in istället.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Konto skapat!",
          description: "Du kan nu logga in med dina uppgifter.",
        });
        // Switch to login tab
        setEmail("");
        setPassword("");
        setFullName("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Valideringsfel",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fel vid registrering",
          description: error instanceof Error ? error.message : "Ett oväntat fel uppstod",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent, retryCount = 0) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Network errors - retry up to 2 times
        if ((error.message.includes("fetch") || error.message.includes("Load failed") || error.message.includes("network")) && retryCount < 2) {
          toast({
            title: "Ansluter...",
            description: `Försök ${retryCount + 2} av 3`,
          });
          setTimeout(() => {
            handleSignIn(e, retryCount + 1);
          }, 1000);
          return;
        }
        
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Fel inloggningsuppgifter",
            description: "Kontrollera din e-post och lösenord.",
            variant: "destructive",
          });
        } else if (error.message.includes("fetch") || error.message.includes("Load failed") || error.message.includes("network")) {
          toast({
            title: "Nätverksfel",
            description: "Kunde inte ansluta till servern. Ladda om sidan och försök igen.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else if (data.session) {
        toast({
          title: "Inloggad!",
          description: "Välkommen tillbaka.",
        });
        navigate("/");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Valideringsfel",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Ett oväntat fel uppstod";
        const isNetworkError = errorMessage.toLowerCase().includes("fetch") || errorMessage.toLowerCase().includes("load failed");
        toast({
          title: "Fel vid inloggning",
          description: isNetworkError ? "Nätverksfel - ladda om sidan och försök igen" : errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Budget 2026</CardTitle>
          <CardDescription>Logga in eller skapa ett nytt konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Skapa konto</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-post</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="din@epost.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Lösenord</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loggar in..." : "Logga in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-access-code">Åtkomstkod</Label>
                  <Input
                    id="signup-access-code"
                    type="password"
                    placeholder="Ange åtkomstkod"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Namn (valfritt)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Ditt namn"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-post</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="din@epost.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Lösenord</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Minst 6 tecken</p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Skapar konto..." : "Skapa konto"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
