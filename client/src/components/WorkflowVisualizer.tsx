import { CheckCircle2, Circle } from "lucide-react";
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
  // Default to 0 (Planning) for any initial state
  let currentIndex = 0;

  // Update currentIndex if currentStage is valid
  if (currentStage && currentStage !== "pending" && currentStage !== "generating") {
    for (let i = 0; i < workflowNodes.length; i++) {
      if (currentStage.includes(workflowNodes[i].id)) {
        currentIndex = i;
        break;
      }
    }
  }

  const isCompleteStage = currentStage === "complete" || currentStage === "quiz_complete";

  return (
    <Card className="border-card-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-2">
          {workflowNodes.map((node, index) => {
            // Determine completed and current states
            const isCompleted = index < currentIndex || (isCompleteStage && index <= workflowNodes.length - 1);
            const isCurrent = !isCompleted && (index === currentIndex || currentStage === "pending" || currentStage === "generating");

            // Debug log
            console.log(`Node: ${node.id}, Index: ${index}, isCompleted: ${isCompleted}, isCurrent: ${isCurrent}, currentStage: ${currentStage}`);

            return (
              <div key={node.id} className="flex-1 flex items-center gap-2">
                <div className="flex flex-col items-center gap-2 flex-1">
                  {/* Circle Container */}
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    {/* Spinning rings */}
                    {isCurrent && (
                      <>
                        <div
                          className="animate-spin absolute inset-0 rounded-full border-[3px] border-transparent"
                          style={{
                            borderTopColor: 'hsl(var(--primary))',
                            borderRightColor: 'hsl(var(--primary))',
                          }}
                        />
                        <div
                          className="animate-spin absolute inset-1 rounded-full border-2 border-transparent"
                          style={{
                            animationDirection: 'reverse',
                            animationDuration: '1.5s',
                            borderBottomColor: 'hsl(var(--primary) / 0.5)',
                            borderLeftColor: 'hsl(var(--primary) / 0.5)',
                          }}
                        />
                      </>
                    )}

                    {/* Inner circle with icon */}
                    <div
                      className={`
                        relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500
                        ${isCompleted 
                          ? 'border-chart-3 bg-chart-3/20' 
                          : isCurrent 
                            ? 'border-primary/30 bg-primary/10'
                            : 'border-muted bg-muted/20'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-chart-3" />
                      ) : isCurrent ? (
                        <div className="animate-pulse h-3 w-3 rounded-full bg-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="text-center min-h-[2.5rem]">
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {node.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {node.description}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {index < workflowNodes.length - 1 && (
                  <div
                    className={`
                      h-0.5 flex-1 transition-all duration-500 -mt-12
                      ${isCompleted ? 'bg-chart-3' : 'bg-muted'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
