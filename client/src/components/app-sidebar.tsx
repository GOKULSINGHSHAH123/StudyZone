import { Plus, Brain, Map } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface LessonHistoryItem {
  id: string;
  topic: string;
  date: Date;
  age_group: string;
  knowledge_level: string;
}

interface AppSidebarProps {
  lessonHistory: LessonHistoryItem[];
  onSelectLesson: (lesson: LessonHistoryItem) => void;
  onNewLesson: () => void;
  onGenerateRoadmap: () => void;
  currentLessonId?: string;
}

export function AppSidebar({ 
  lessonHistory, 
  onSelectLesson, 
  onNewLesson,
  onGenerateRoadmap,
  currentLessonId 
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              onClick={onNewLesson}
              className="w-full justify-start gap-2"
              variant="ghost"
              size="sm"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">New Lesson</span>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              onClick={onGenerateRoadmap}
              className="w-full justify-start gap-2"
              variant="ghost"
              size="sm"
            >
              <Map className="h-4 w-4 shrink-0" />
              <span className="truncate">Generate Roadmap</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2">Recent Lessons</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {lessonHistory.length === 0 ? (
                <div className="px-2 py-8 text-sm text-muted-foreground text-center">
                  No lessons yet
                </div>
              ) : (
                lessonHistory.map((lesson) => (
                  <SidebarMenuItem key={lesson.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectLesson(lesson)}
                      isActive={currentLessonId === lesson.id}
                      className="group h-auto py-2"
                      tooltip={lesson.topic}
                    >
                      <Brain className="h-4 w-4 shrink-0" />
                      <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                        <span className="truncate text-sm font-medium">
                          {lesson.topic}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {lesson.age_group} • {lesson.knowledge_level}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
