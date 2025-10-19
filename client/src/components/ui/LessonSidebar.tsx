// src/components/ui/LessonSidebar.tsx
import { useLesson } from "@/hooks/useLesson";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";        // shadcn/ui button
import { ScrollArea } from "@/components/ui/scroll-area"; // shadcn/ui scroll area
import { cn } from "@/lib/utils";

export function LessonSidebar() {
  const {
    lessons,
    currentId,
    createLesson,
    selectLesson,
    removeLesson,
  } = useLesson();

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center gap-2">
        <Button
          className="w-full"
          onClick={() => createLesson("New lesson")}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create new lesson
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <ul className="p-2 space-y-1">
          {lessons.map((l) => (
            <li
              key={l.id}
              className={cn(
                "group flex items-center justify-between rounded px-2 py-2 cursor-pointer hover:bg-muted",
                currentId === l.id && "bg-muted"
              )}
              onClick={() => selectLesson(l.id)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{l.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(l.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLesson(l.id);
                }}
                aria-label="Delete lesson"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {lessons.length === 0 && (
            <li className="px-2 py-4 text-xs text-muted-foreground">
              No lessons yet — create one to get started.
            </li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
