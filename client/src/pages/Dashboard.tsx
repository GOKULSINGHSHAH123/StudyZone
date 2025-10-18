import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Brain, Sparkles } from "lucide-react";
import { lessonInputSchema, type LessonInput } from "@shared/schema";
import { WorkflowVisualizer } from "@/components/WorkflowVisualizer";
import { LessonDisplay } from "@/components/LessonDisplay";
import { QuizDisplay } from "@/components/QuizDisplay";
import { useLesson } from "@/hooks/useLesson";

export default function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { lessonState, startLesson, clearLesson } = useLesson();
  
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
    await startLesson(data);
    setIsGenerating(false);
  };

  const handleNewLesson = () => {
    clearLesson();
    form.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Visual Learning Assistant</h1>
              <p className="text-xs text-muted-foreground">Powered by AI & Vision Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">LangGraph Workflow</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 py-12 max-w-7xl">
        {!lessonState ? (
          /* Input Form */
          <div className="animate-slide-in">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
                Create Your Learning Experience
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Generate comprehensive lessons with AI-analyzed visuals, detailed explanations, and interactive quizzes
              </p>
            </div>

            <Card className="max-w-2xl mx-auto border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Learning Configuration
                </CardTitle>
                <CardDescription>
                  Tell us what you want to learn and we'll create a personalized lesson plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Photosynthesis, Machine Learning, Ancient Rome..."
                              {...field}
                              data-testid="input-topic"
                              className="bg-background/50"
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
                          <FormLabel>Age Group</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-age-group" className="bg-background/50">
                                <SelectValue placeholder="Select age group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Elementary School">Elementary School</SelectItem>
                              <SelectItem value="Middle School">Middle School</SelectItem>
                              <SelectItem value="High School">High School</SelectItem>
                              <SelectItem value="College">College</SelectItem>
                              <SelectItem value="Adult Learner">Adult Learner</SelectItem>
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
                          <FormLabel>Knowledge Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-knowledge-level" className="bg-background/50">
                                <SelectValue placeholder="Select knowledge level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isGenerating}
                      data-testid="button-generate"
                    >
                      {isGenerating ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Learning Experience
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Features Preview */}
            <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="hover-elevate border-card-border">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">AI Lesson Planning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Intelligent curriculum generation tailored to your age group and knowledge level
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate border-card-border">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-2">
                    <Sparkles className="h-6 w-6 text-chart-2" />
                  </div>
                  <CardTitle className="text-lg">Vision Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Images analyzed by AI to generate accurate, detailed visual explanations
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate border-card-border">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-2">
                    <BookOpen className="h-6 w-6 text-chart-3" />
                  </div>
                  <CardTitle className="text-lg">Interactive Quizzes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Test your understanding with AI-generated questions and detailed explanations
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Lesson Content */
          <div className="space-y-8 animate-slide-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">{lessonState.topic}</h2>
                <p className="text-muted-foreground mt-1">
                  {lessonState.age_group} • {lessonState.knowledge_level}
                </p>
              </div>
              <Button onClick={handleNewLesson} variant="outline" data-testid="button-new-lesson">
                New Lesson
              </Button>
            </div>

            <WorkflowVisualizer currentStage={lessonState.current_processing} />

            {lessonState.lesson_plan && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-chart-2/5">
                <CardHeader>
                  <CardTitle>Lesson Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/90 leading-relaxed">{lessonState.lesson_plan.overview}</p>
                </CardContent>
              </Card>
            )}

            <LessonDisplay lessonState={lessonState} />

            {lessonState.quiz && <QuizDisplay quiz={lessonState.quiz} topic={lessonState.topic} />}
          </div>
        )}
      </div>
    </div>
  );
}
