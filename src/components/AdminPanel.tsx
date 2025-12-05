import { useState, useEffect } from "react";
import { useAdmin, UserWithRole } from "@/hooks/useAdmin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, Users } from "lucide-react";

export const AdminPanel = () => {
  const { isAdmin, isLoading: adminLoading, getAllUsers, setUserRole } = useAdmin();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "user">("user");
  const [isCreating, setIsCreating] = useState(false);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const fetchedUsers = await getAllUsers();
    setUsers(fetchedUsers);
    setIsLoadingUsers(false);
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadUsers();
    }
  }, [isOpen, isAdmin]);

  const handleRoleChange = async (userId: string, role: "admin" | "user") => {
    const success = await setUserRole(userId, role);
    if (success) {
      toast({
        title: "Roll uppdaterad",
        description: `Användarens roll har ändrats till ${role}`,
      });
      loadUsers();
    } else {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera användarens roll",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Fyll i alla fält",
        description: "E-post och lösenord krävs",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Create the user via Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newUserName || undefined,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Set the role if admin
        if (newUserRole === "admin") {
          await setUserRole(data.user.id, "admin");
        }

        toast({
          title: "Användare skapad",
          description: `${newUserEmail} har skapats`,
        });

        // Reset form
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserName("");
        setNewUserRole("user");
        setShowCreateUser(false);

        // Reload users after a short delay to allow profile to be created
        setTimeout(() => loadUsers(), 1000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ett fel uppstod";
      toast({
        title: "Kunde inte skapa användare",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (adminLoading) return null;
  if (!isAdmin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Användarhantering
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create User Section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Skapa ny användare</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateUser(!showCreateUser)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {showCreateUser ? "Stäng" : "Ny användare"}
              </Button>
            </div>

            {showCreateUser && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-post *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="namn@exempel.se"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Lösenord *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Minst 6 tecken"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Namn</Label>
                    <Input
                      id="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Förnamn Efternamn"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Roll</Label>
                    <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as "admin" | "user")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Användare</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating ? "Skapar..." : "Skapa användare"}
                </Button>
              </div>
            )}
          </div>

          {/* Users List */}
          <div>
            <h3 className="font-semibold mb-4">Befintliga användare ({users.length})</h3>
            {isLoadingUsers ? (
              <p className="text-muted-foreground">Laddar användare...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-post</TableHead>
                    <TableHead>Namn</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Skapad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as "admin" | "user")}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                {user.role === "admin" ? "Admin" : "Användare"}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Användare</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("sv-SE") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
