import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Image as ImageIcon } from "lucide-react";
import type { LessonState } from "@shared/schema";
import ReactMarkdown from "react-markdown";


interface Props {
  lessonState: LessonState;
  streamContent?: (point: any) => AsyncGenerator<string, void, unknown>;
}


export function LessonDisplay({ lessonState, streamContent }: Props) {
  const [streamedContent, setStreamedContent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!streamContent || !lessonState.key_points) return;

    lessonState.key_points.forEach(async (point) => {
      let accumulated = "";
      for await (const chunk of streamContent(point)) {
        accumulated += chunk;
        setStreamedContent((prev) => ({ ...prev, [point.point_title]: accumulated }));
      }
    });
  }, [lessonState.key_points, streamContent]);

  if (!lessonState.key_points || lessonState.key_points.length === 0) return null;

  const hasVisionAnalysis = Object.keys(lessonState.analyzed_descriptions).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold">Key Learning Points</h3>
        {hasVisionAnalysis && (
          <Badge variant="secondary" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {Object.keys(lessonState.analyzed_descriptions).length} Vision Analyzed
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {lessonState.key_points.map((point, index) => {
          const hasImage = lessonState.images_data[point.point_title]?.best_image;
          const isAnalyzed = point.point_title in lessonState.analyzed_descriptions;

          const rawContent = streamedContent[point.point_title] || lessonState.content_data[point.point_title] || "";

          const sections = rawContent.split(/(?=🎯|👁️|💡|🌍)/);

          return (
            <Card key={point.point_title} className="border-card-border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-chart-2/10 border-b border-card-border py-1.5 px-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {index + 1}. {point.point_title}
                      </CardTitle>
                      {isAnalyzed && (
                        <Badge variant="outline" className="gap-1 border-primary/50 text-primary text-xs">
                          <Eye className="h-3 w-3" />
                          Vision Analyzed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{point.explanation}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                <div className="grid md:grid-cols-[2fr,3fr] gap-3">
                  {/* Image Section */}
                  <div className="space-y-1.5">
                    {hasImage ? (
                      <div className="rounded-lg overflow-hidden border border-card-border bg-card">
                        <img
                          src={lessonState.images_data[point.point_title].best_image!.url}
                          alt={point.point_title}
                          className="w-full h-auto"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed border-muted bg-muted/5">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/50 mb-1" />
                        <p className="text-xs text-muted-foreground">Loading visual...</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{point.visual_type}</Badge>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="space-y-1.5">
                    {sections.length > 0 ? (
                      sections.map((section, sIndex) => (
                        <div key={sIndex} className="border border-muted/30 bg-muted/5 rounded-md p-2">
                          <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap">
                            <div className="text-foreground/90 leading-relaxed">
                              <ReactMarkdown>{section}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-1.5">
                        <div className="h-3 bg-muted rounded animate-shimmer" />
                        <div className="h-3 bg-muted rounded animate-shimmer" />
                        <div className="h-3 bg-muted rounded animate-shimmer" />
                        <p className="text-xs text-muted-foreground text-center mt-2">Generating content...</p>
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
