import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HistoryEntry {
  id: string;
  topic: string;
  createdAt: string;
  roadmap: any;
}

interface RoadmapHistoryProps {
  onSelectRoadmap: (roadmap: any) => void;
}

export function RoadmapHistory({ onSelectRoadmap }: RoadmapHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch("/api/roadmap/history");
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No roadmaps generated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Roadmap History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelectRoadmap(entry.roadmap)}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <div>
              <p className="font-medium">{entry.topic}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
