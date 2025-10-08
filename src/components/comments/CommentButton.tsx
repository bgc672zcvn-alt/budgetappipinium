import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface CommentButtonProps {
  company: string;
  field: string;
  month?: string;
  value: number | string;
}

export const CommentButton = ({ company, field, month, value }: CommentButtonProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("company", company)
        .eq("target_field", field)
        .eq("target_month", month || "")
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // Get user profiles for all comments
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedComments = commentsData?.map(comment => ({
        ...comment,
        user_email: profileMap.get(comment.user_id)?.email,
        user_name: profileMap.get(comment.user_id)?.full_name,
      })) || [];

      setComments(enrichedComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, company, field, month]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        company,
        target_field: field,
        target_month: month || null,
        comment_text: newComment.trim(),
      });

      if (error) throw error;

      toast({
        title: "Kommentar tillagd",
        description: "Din kommentar har sparats.",
      });

      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Fel",
        description: "Kunde inte spara kommentaren.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-accent relative"
        >
          <MessageSquare className="h-3 w-3" />
          {comments.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {comments.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              Kommentarer för {field}
              {month && ` - ${month}`}
            </h4>
            <span className="text-xs text-muted-foreground">
              Värde: {typeof value === "number" ? value.toLocaleString("sv-SE") : value}
            </span>
          </div>

          {/* Existing comments */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Inga kommentarer ännu
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-muted rounded-lg p-3 space-y-1">
                  <p className="text-sm">{comment.comment_text}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      {comment.user_name || comment.user_email || "Okänd användare"}
                    </span>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add new comment */}
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder="Skriv en kommentar..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-20 resize-none"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || isLoading}
              size="sm"
              className="w-full"
            >
              {isLoading ? "Sparar..." : "Lägg till kommentar"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

