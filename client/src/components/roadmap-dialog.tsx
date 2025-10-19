import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Map, Sparkles } from "lucide-react";

interface RoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (topic: string) => void;
}

export function RoadmapDialog({ open, onOpenChange, onGenerate }: RoadmapDialogProps) {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    await onGenerate(topic);
    setIsGenerating(false);
    setTopic("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Map className="h-6 w-6 text-primary" />
            Generate Learning Roadmap
          </DialogTitle>
          <DialogDescription>
            Enter a topic and we'll create a comprehensive learning roadmap tailored to your journey
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="roadmap-topic" className="text-base">
              What do you want to learn?
            </Label>
            <Input
              id="roadmap-topic"
              placeholder="e.g., Full Stack Development, Data Science, React..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-12 text-base"
              autoFocus
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!topic.trim() || isGenerating}
              className="min-w-[140px]"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Roadmap
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}