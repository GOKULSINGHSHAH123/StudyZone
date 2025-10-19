import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, BookOpen, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface RoadmapDisplayProps {
  roadmap: RoadmapData;
}

export function RoadmapDisplay({ roadmap }: RoadmapDisplayProps) {
  return (
    <div className="space-y-8 animate-slide-in">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
          {roadmap.topic} Learning Roadmap
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          {roadmap.description}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Total Duration: {roadmap.totalDuration}</span>
        </div>
      </div>

      {/* Prerequisites */}
      {roadmap.prerequisites && roadmap.prerequisites.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-500" />
              Prerequisites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {roadmap.prerequisites.map((prereq, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {prereq}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roadmap Phases - Timeline View */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-chart-2 to-chart-3" />

        <div className="space-y-8">
          {roadmap.phases.map((phase, index) => (
            <div key={index} className="relative pl-20">
              {/* Phase Number Circle */}
              <div className="absolute left-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {index + 1}
                </div>
              </div>

              {/* Phase Card */}
              <Card className="hover-elevate border-card-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Badge variant="outline" className="mb-2">
                        {phase.phase}
                      </Badge>
                      <CardTitle className="text-2xl">{phase.title}</CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{phase.duration}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Topics */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      What You'll Learn
                    </h4>
                    <div className="grid gap-2">
                      {phase.topics.map((topic, topicIndex) => (
                        <div
                          key={topicIndex}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resources */}
                  {phase.resources && phase.resources.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                        Recommended Resources
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {phase.resources.map((resource, resourceIndex) => (
                          <Badge
                            key={resourceIndex}
                            variant="secondary"
                            className="text-xs"
                          >
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Career Paths */}
      {roadmap.careerPaths && roadmap.careerPaths.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-green-500" />
              Career Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roadmap.careerPaths.map((career, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border bg-background hover:border-green-500/50 transition-colors"
                >
                  <p className="font-medium text-sm">{career}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
