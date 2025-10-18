import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkflowStage } from "@shared/schema";

interface WorkflowNode {
  id: WorkflowStage;
  label: string;
  description: string;
}

const workflowNodes: WorkflowNode[] = [
  { id: "lesson_planning", label: "Planning", description: "Creating lesson structure" },
  { id: "image_search", label: "Image Search", description: "Finding relevant visuals" },
  { id: "image_processing", label: "Vision Analysis", description: "AI analyzing images" },
  { id: "content_generation", label: "Content", description: "Generating explanations" },
  { id: "quiz_generation", label: "Quiz", description: "Creating assessment" }
];

interface Props {
  currentStage: string;
}

export function WorkflowVisualizer({ currentStage }: Props) {
  const getCurrentIndex = () => {
    const index = workflowNodes.findIndex(node => 
      currentStage.includes(node.id) || currentStage === `${node.id}_complete`
    );
    return index >= 0 ? index : -1;
  };

  const currentIndex = getCurrentIndex();
  const isComplete = currentStage === "complete" || currentStage === "quiz_complete";

  return (
    <Card className="border-card-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-2">
          {workflowNodes.map((node, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex || isComplete;
            const isCurrent = isActive && !currentStage.includes("complete");

            return (
              <div key={node.id} className="flex-1 flex items-center gap-2">
                <div className="flex flex-col items-center gap-2 flex-1">
                  {/* Node Circle */}
                  <div className={`
                    relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500
                    ${isCompleted 
                      ? 'border-chart-3 bg-chart-3/20' 
                      : isCurrent 
                        ? 'border-primary bg-primary/20 animate-pulse-subtle'
                        : 'border-muted bg-muted/20'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-chart-3" />
                    ) : isCurrent ? (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center min-h-[2.5rem]">
                    <p className={`text-sm font-medium transition-colors ${
                      isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {node.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {node.description}
                    </p>
                  </div>
                </div>

                {/* Connecting Line */}
                {index < workflowNodes.length - 1 && (
                  <div className={`
                    h-0.5 flex-1 transition-all duration-500 -mt-12
                    ${isCompleted ? 'bg-chart-3' : 'bg-muted'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
