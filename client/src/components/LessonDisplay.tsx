import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Image as ImageIcon } from "lucide-react";
import type { LessonState } from "@shared/schema";

interface Props {
  lessonState: LessonState;
}

export function LessonDisplay({ lessonState }: Props) {
  if (!lessonState.key_points || lessonState.key_points.length === 0) {
    return null;
  }

  const hasVisionAnalysis = Object.keys(lessonState.analyzed_descriptions).length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Key Learning Points</h3>
        {hasVisionAnalysis && (
          <Badge variant="secondary" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {Object.keys(lessonState.analyzed_descriptions).length} Vision Analyzed
          </Badge>
        )}
      </div>

      <div className="space-y-6">
        {lessonState.key_points.map((point, index) => {
          const hasImage = lessonState.images_data[point.point_title]?.best_image;
          const isAnalyzed = point.point_title in lessonState.analyzed_descriptions;
          const content = lessonState.content_data[point.point_title] || "";

          return (
            <Card key={point.point_title} className="border-card-border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-chart-2/10 border-b border-card-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">
                        {index + 1}. {point.point_title}
                      </CardTitle>
                      {isAnalyzed && (
                        <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                          <Eye className="h-3 w-3" />
                          Vision Analyzed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{point.explanation}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-[2fr,3fr] gap-6">
                  {/* Image Section */}
                  <div className="space-y-3">
                    {hasImage ? (
                      <div className="rounded-lg overflow-hidden border border-card-border bg-card">
                        <img
                          src={lessonState.images_data[point.point_title].best_image!.url}
                          alt={point.point_title}
                          className="w-full h-auto"
                          data-testid={`img-point-${index}`}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-muted bg-muted/5">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Loading visual...</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{point.visual_type}</Badge>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="space-y-4">
                    {content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none" data-testid={`content-point-${index}`}>
                        <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {content}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:1000px_100%]" />
                        <div className="h-4 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:1000px_100%]" style={{ animationDelay: "0.1s" }} />
                        <div className="h-4 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:1000px_100%]" style={{ animationDelay: "0.2s" }} />
                        <p className="text-sm text-muted-foreground text-center mt-4">Generating content...</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
