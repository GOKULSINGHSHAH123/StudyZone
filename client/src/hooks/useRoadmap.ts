import { useState } from "react";

interface RoadmapPhase {
  phase: string;
  title: string;
  duration: string;
  topics: string[];
  resources?: string[];
}

interface RoadmapData {
  topic: string;
  description: string;
  totalDuration: string;
  phases: RoadmapPhase[];
  prerequisites?: string[];
  careerPaths?: string[];
}

export function useRoadmap() {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRoadmap = async (topic: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate roadmap");
      }

      const data = await response.json();
      setRoadmap(data.roadmap);
      return data.roadmap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      console.error("Roadmap generation error:", err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearRoadmap = () => {
    setRoadmap(null);
    setError(null);
  };

  return {
    roadmap,
    isGenerating,
    error,
    generateRoadmap,
    clearRoadmap,
  };
}
