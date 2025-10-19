import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Brain, Sparkles, ArrowLeft, Zap, Target, TrendingUp, Stars } from "lucide-react";
import { lessonInputSchema, type LessonInput } from "@shared/schema";
import { WorkflowVisualizer } from "@/components/WorkflowVisualizer";
import { LessonDisplay } from "@/components/LessonDisplay";
import { QuizDisplay } from "@/components/QuizDisplay";
import { useLesson } from "@/hooks/useLesson";
import { useRoadmap } from "@/hooks/useRoadmap";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RoadmapDialog } from "@/components/roadmap-dialog";
import { RoadmapDisplay } from "@/components/roadmap-display";

interface LessonHistoryItem {
  id: string;
  topic: string;
  date: Date;
  age_group: string;
  knowledge_level: string;
  lessonState?: any;
}

export default function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { lessonState, startLesson, clearLesson } = useLesson();
  const { roadmap, generateRoadmap, clearRoadmap } = useRoadmap();
  const [lessonHistory, setLessonHistory] = useState<LessonHistoryItem[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>();
  const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [tempLessonData, setTempLessonData] = useState<any>(null);
  
  const form = useForm<LessonInput>({
    resolver: zodResolver(lessonInputSchema),
    defaultValues: {
      topic: "",
      age_group: "High School",
      knowledge_level: "Beginner"
    }
  });

  const onSubmit = async (data: LessonInput) => {
    setIsGenerating(true);
    
    const immediateData = {
      topic: data.topic,
      age_group: data.age_group,
      knowledge_level: data.knowledge_level,
      current_processing: "pending",
      lesson_plan: null,
      learning_points: [],
      quiz: null
    };
    
    setTempLessonData(immediateData);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const lesson = await startLesson(data);
    
    const newLesson: LessonHistoryItem = {
      id: Date.now().toString(),
      topic: data.topic,
      date: new Date(),
      age_group: data.age_group,
      knowledge_level: data.knowledge_level,
      lessonState: lesson
    };
    
    setLessonHistory(prev => [newLesson, ...prev]);
    setCurrentLessonId(newLesson.id);
    setTempLessonData(null);
    setIsGenerating(false);
  };

  const handleNewLesson = () => {
    clearLesson();
    clearRoadmap();
    setShowRoadmap(false);
    setTempLessonData(null);
    form.reset();
    setCurrentLessonId(undefined);
  };

  const handleSelectLesson = (lesson: LessonHistoryItem) => {
    setCurrentLessonId(lesson.id);
    setShowRoadmap(false);
    setTempLessonData(null);
  };

  const handleGenerateRoadmap = () => {
    setRoadmapDialogOpen(true);
  };

  const handleRoadmapGenerate = async (topic: string) => {
    try {
      await generateRoadmap(topic);
      setShowRoadmap(true);
      clearLesson();
      setCurrentLessonId(undefined);
      setTempLessonData(null);
    } catch (error) {
      console.error("Failed to generate roadmap:", error);
    }
  };

  const displayState = tempLessonData || lessonState;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        <AppSidebar
          lessonHistory={lessonHistory}
          onSelectLesson={handleSelectLesson}
          onNewLesson={handleNewLesson}
          onGenerateRoadmap={handleGenerateRoadmap}
          currentLessonId={currentLessonId}
        />

        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
            <div className="flex h-20 items-center gap-4 px-8">
              <SidebarTrigger className="hover:bg-primary/10 transition-colors" />
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-chart-2 to-primary rounded-xl blur-md opacity-50 animate-pulse" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-chart-2 to-primary shadow-lg">
                    <Brain className="h-7 w-7 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Study Zone
                  </h1>
                  <p className="text-sm text-muted-foreground leading-tight flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Powered by AI & Vision Analysis
                  </p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="group relative overflow-hidden rounded-full bg-gradient-to-r from-primary/20 via-chart-2/20 to-primary/20 p-[1px] hover:from-primary/30 hover:via-chart-2/30 hover:to-primary/30 transition-all">
                  <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </div>
                    <span className="text-sm font-semibold bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
                      LangGraph Workflow
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-8 py-10 max-w-7xl">
            {showRoadmap && roadmap ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button
                  onClick={handleNewLesson}
                  variant="ghost"
                  className="mb-6 hover:bg-primary/10 transition-all group"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Home
                </Button>
                <RoadmapDisplay roadmap={roadmap} />
              </div>
            ) : !displayState ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-12 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-4">
                    <Stars className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">AI-Powered Learning</span>
                  </div>
                  <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent leading-tight animate-gradient">
                    Create Your Learning Experience
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                    Generate comprehensive lessons with AI-analyzed visuals, detailed explanations, and interactive quizzes tailored to your needs
                  </p>
                </div>

                <Card className="max-w-2xl mx-auto border-2 border-primary/20 shadow-2xl hover:shadow-primary/20 transition-all duration-300 bg-gradient-to-br from-background via-background to-primary/5">
                  <CardHeader className="pb-6 space-y-3">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      Learning Configuration
                    </CardTitle>
                    <CardDescription className="text-base">
                      Tell us what you want to learn and we'll create a personalized lesson plan just for you
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="topic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">Topic</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Photosynthesis, Machine Learning, Ancient Rome..."
                                  {...field}
                                  data-testid="input-topic"
                                  className="h-12 bg-background/50 border-2 focus:border-primary transition-colors text-base"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="age_group"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">Age Group</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger 
                                    data-testid="select-age-group" 
                                    className="h-12 bg-background/50 border-2 focus:border-primary transition-colors text-base"
                                  >
                                    <SelectValue placeholder="Select age group" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Elementary School">🎒 Elementary School</SelectItem>
                                  <SelectItem value="Middle School">📚 Middle School</SelectItem>
                                  <SelectItem value="High School">🎓 High School</SelectItem>
                                  <SelectItem value="College">🏛️ College</SelectItem>
                                  <SelectItem value="Adult Learner">👔 Adult Learner</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="knowledge_level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold">Knowledge Level</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger 
                                    data-testid="select-knowledge-level" 
                                    className="h-12 bg-background/50 border-2 focus:border-primary transition-colors text-base"
                                  >
                                    <SelectValue placeholder="Select knowledge level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Beginner">🌱 Beginner</SelectItem>
                                  <SelectItem value="Intermediate">🌿 Intermediate</SelectItem>
                                  <SelectItem value="Advanced">🌳 Advanced</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary via-chart-2 to-primary hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                          disabled={isGenerating}
                          data-testid="button-generate"
                        >
                          {isGenerating ? (
                            <>
                              <div className="h-5 w-5 animate-spin rounded-full border-3 border-current border-t-transparent mr-3" />
                              Generating Your Lesson...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5 mr-3 animate-pulse" />
                              Generate Learning Experience
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer hover:-translate-y-2 bg-gradient-to-br from-background to-primary/5">
                    <CardHeader className="pb-4">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg group-hover:blur-xl transition-all" />
                        <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                          <Brain className="h-7 w-7 text-primary-foreground" />
                        </div>
                      </div>
                      <CardTitle className="text-xl leading-tight">AI Lesson Planning</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-base text-muted-foreground leading-relaxed">
                        Intelligent curriculum generation tailored to your age group and knowledge level with adaptive learning paths
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-chart-2/50 cursor-pointer hover:-translate-y-2 bg-gradient-to-br from-background to-chart-2/5">
                    <CardHeader className="pb-4">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-chart-2/20 rounded-xl blur-lg group-hover:blur-xl transition-all" />
                        <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-chart-2 to-chart-2/70 flex items-center justify-center shadow-lg">
                          <Sparkles className="h-7 w-7 text-primary-foreground" />
                        </div>
                      </div>
                      <CardTitle className="text-xl leading-tight">Vision Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-base text-muted-foreground leading-relaxed">
                        Images analyzed by advanced AI to generate accurate, detailed visual explanations and contextual insights
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-chart-3/50 cursor-pointer hover:-translate-y-2 bg-gradient-to-br from-background to-chart-3/5">
                    <CardHeader className="pb-4">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-chart-3/20 rounded-xl blur-lg group-hover:blur-xl transition-all" />
                        <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-chart-3 to-chart-3/70 flex items-center justify-center shadow-lg">
                          <Target className="h-7 w-7 text-primary-foreground" />
                        </div>
                      </div>
                      <CardTitle className="text-xl leading-tight">Interactive Quizzes</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-base text-muted-foreground leading-relaxed">
                        Test your understanding with AI-generated questions, instant feedback, and detailed explanations
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-12 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Powered by cutting-edge AI technology</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-chart-2/10 to-primary/10 border-2 border-primary/20">
                  <div>
                    <h2 className="text-4xl font-bold leading-tight bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
                      {displayState.topic}
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/50 text-sm font-medium">
                        {displayState.age_group}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/50 text-sm font-medium">
                        {displayState.knowledge_level}
                      </span>
                    </p>
                  </div>
                  <Button 
                    onClick={handleNewLesson} 
                    variant="outline" 
                    className="h-12 px-6 text-base font-semibold hover:bg-primary/10 hover:border-primary transition-all"
                    data-testid="button-new-lesson"
                  >
                    <TrendingUp className="h-5 w-5 mr-2" />
                    New Lesson
                  </Button>
                </div>

                <WorkflowVisualizer currentStage={displayState.current_processing} />

                {displayState.lesson_plan && (
                  <Card className="border-2 border-primary/30 shadow-lg bg-gradient-to-br from-primary/10 via-chart-2/10 to-primary/5 hover:shadow-xl transition-all">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        Lesson Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-foreground/90 text-lg leading-relaxed">{displayState.lesson_plan.overview}</p>
                    </CardContent>
                  </Card>
                )}

                <LessonDisplay lessonState={displayState} />

                {displayState.quiz && <QuizDisplay quiz={displayState.quiz} topic={displayState.topic} />}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      <RoadmapDialog
        open={roadmapDialogOpen}
        onOpenChange={setRoadmapDialogOpen}
        onGenerate={handleRoadmapGenerate}
      />
    </SidebarProvider>
  );
}
