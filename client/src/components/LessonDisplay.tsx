import { Badge } from "@/components/ui/badge";
import { Eye, Sparkles, Zap, ImageIcon } from "lucide-react";
import type { LessonState } from "@shared/schema";
import ReactMarkdown from "react-markdown";

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
      {/* Header Section with Glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-chart-2/20 to-chart-3/20 backdrop-blur-sm border border-white/20 shadow-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Key Learning Points
            </h3>
          </div>
          {hasVisionAnalysis && (
            <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm font-medium shadow-lg">
              <Eye className="h-4 w-4" />
              {Object.keys(lessonState.analyzed_descriptions).length} Vision Analyzed
            </Badge>
          )}
        </div>
      </div>

      {/* Key Points List with Staggered Animation */}
      <div className="space-y-6">
        {lessonState.key_points.map((point, index) => {
          const hasImage = lessonState.images_data[point.point_title]?.best_image;
          const isAnalyzed = point.point_title in lessonState.analyzed_descriptions;
          const content = lessonState.content_data[point.point_title] || "";

          return (
            <div
              key={point.point_title}
              className="group relative rounded-2xl overflow-hidden border border-card-border/50 bg-gradient-to-br from-card via-card to-card/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Animated gradient border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-chart-2 to-chart-3 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl" />
              
              {/* Point number badge */}
              <div className="absolute -left-4 top-8 z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-chart-2 rounded-full blur-md opacity-60" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-chart-2 rounded-full flex items-center justify-center shadow-lg border-4 border-background">
                    <span className="text-xl font-bold text-white">{index + 1}</span>
                  </div>
                </div>
              </div>

              {/* Header with gradient */}
              <div className="relative bg-gradient-to-r from-primary/15 via-chart-2/15 to-chart-3/10 border-b border-card-border/30 p-5 pl-14">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h4 className="text-2xl font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {point.point_title}
                      </h4>
                      {isAnalyzed && (
                        <Badge
                          variant="outline"
                          className="gap-1.5 border-primary/50 text-primary bg-primary/5 shadow-sm animate-pulse"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Vision Analyzed
                        </Badge>
                      )}
                    </div>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {point.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Section - Full Width or Split Layout */}
              <div className="p-6">
                {/* Text Content Section with Enhanced Typography */}
                <div className="space-y-3">
                  {content ? (
                    <div
                      className="prose prose-lg dark:prose-invert max-w-none"
                      data-testid={`content-point-${index}`}
                    >
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => (
                            <h1 className="text-4xl font-black mt-8 mb-6 bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent leading-tight tracking-tight" {...props} />
                          ),
                          h2: ({node, children, ...props}) => {
                            const text = String(children);
                            const isVisualGuidance = text.toLowerCase().includes('visual') || text.toLowerCase().includes('diagram') || text.toLowerCase().includes('illustration');
                            
                            return (
                              <div className="mt-8 first:mt-0">
                                {index !== 0 && <hr className="mb-6 border-t-2 border-gradient-to-r from-transparent via-card-border to-transparent" />}
                                <h2 className="text-2xl font-black mb-5 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent leading-tight flex items-center gap-2 tracking-tight" {...props}>
                                  {children}
                                </h2>
                                {isVisualGuidance && hasImage && (
                                  <div className="mb-6 float-left mr-6 w-full md:w-1/2 lg:w-2/5">
                                    <div className="group/image relative">
                                      <div className="absolute -inset-2 bg-gradient-to-br from-primary/20 to-chart-2/20 rounded-2xl blur-xl opacity-0 group-hover/image:opacity-100 transition-opacity duration-500" />
                                      <div className="relative rounded-xl overflow-hidden border-2 border-card-border/50 shadow-lg group-hover/image:shadow-2xl transition-all duration-500 group-hover/image:border-primary/50">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500" />
                                        <img
                                          src={lessonState.images_data[point.point_title].best_image!.url}
                                          alt={point.point_title}
                                          className="w-full h-auto transform group-hover/image:scale-105 transition-transform duration-700"
                                          data-testid={`img-point-${index}`}
                                        />
                                        <div className="absolute top-3 right-3 p-2 rounded-lg bg-black/50 backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                                          <Zap className="h-4 w-4 text-white" />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs font-medium shadow-sm bg-gradient-to-r from-primary/10 to-chart-2/10 border-primary/30">
                                          {point.visual_type}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          },
                          h3: ({node, ...props}) => (
                            <h3 className="text-xl font-extrabold mt-6 mb-4 text-primary leading-snug tracking-tight" {...props} />
                          ),
                          h4: ({node, ...props}) => (
                            <h4 className="text-lg font-bold mt-5 mb-3 text-primary/90 leading-snug" {...props} />
                          ),
                          h5: ({node, ...props}) => (
                            <h5 className="text-sm font-semibold mt-3 mb-2 text-primary leading-snug" {...props} />
                          ),
                          h6: ({node, ...props}) => (
                            <h6 className="text-sm font-medium mt-3 mb-1.5 text-primary leading-snug" {...props} />
                          ),
                          strong: ({node, ...props}) => (
                            <strong className="font-extrabold text-primary relative inline-block after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-primary/50 after:to-chart-2/50 after:opacity-30" {...props} />
                          ),
                          em: ({node, ...props}) => (
                            <em className="italic font-medium text-chart-2 not-italic" {...props} />
                          ),
                          li: ({node, ...props}) => (
                            <li className="ml-5 my-3 text-[17px] text-foreground leading-[1.8] hover:text-foreground/100 transition-colors pl-2" {...props} />
                          ),
                          ul: ({node, ...props}) => (
                            <ul className="list-disc my-5 space-y-1 ml-4 marker:text-primary" {...props} />
                          ),
                          ol: ({node, ...props}) => (
                            <ol className="list-decimal my-5 space-y-1 ml-4 marker:text-primary marker:font-bold" {...props} />
                          ),
                          p: ({node, ...props}) => (
                            <p className="my-5 text-[17px] leading-[1.8] text-foreground/95 font-normal" {...props} />
                          ),
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-[5px] border-primary/60 bg-gradient-to-r from-primary/10 to-transparent pl-6 pr-4 py-4 my-6 italic text-foreground/90 text-lg rounded-r-lg shadow-sm" {...props} />
                          ),
                          code: ({node, inline, className, children, ...props}: any) => 
                            inline ? (
                              <code className="bg-primary/15 text-primary px-2.5 py-1 rounded-md text-[15px] font-mono font-semibold border border-primary/25 shadow-sm" {...props}>
                                {children}
                              </code>
                            ) : (
                              <code className="block bg-muted/60 p-5 rounded-xl my-5 text-[15px] font-mono overflow-x-auto border-2 border-card-border shadow-lg leading-relaxed" {...props}>
                                {children}
                              </code>
                            ),
                          hr: ({node, ...props}) => (
                            <hr className="my-6 border-t-2 border-gradient-to-r from-transparent via-card-border to-transparent" {...props} />
                          ),
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Enhanced loading shimmer effect */}
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-4 bg-gradient-to-r from-muted via-primary/20 to-muted rounded-full animate-shimmer bg-[length:1000px_100%] shadow-sm"
                          style={{ 
                            animationDelay: `${i * 0.1}s`,
                            width: i === 3 ? '60%' : '100%'
                          }}
                        />
                      ))}
                      <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-dashed border-muted">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 bg-chart-2 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-chart-3 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <p className="text-sm text-muted-foreground font-medium ml-2">
                          Generating content...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}