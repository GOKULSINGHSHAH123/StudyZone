import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Download } from "lucide-react";

interface Props {
  quiz: string;
  topic: string;
}

export function QuizDisplay({ quiz, topic }: Props) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  // Parse quiz text to extract questions
  const parseQuiz = () => {
    const questions = quiz.split(/\*\*Question \d+:\*\*/g).filter(q => q.trim());
    return questions.map((q, idx) => {
      const lines = q.trim().split('\n').filter(l => l.trim());
      const questionText = lines[0]?.replace(/^\*+|\*+$/g, '').trim() || '';
      
      const options: Record<string, string> = {};
      let correctAnswer = '';
      let explanation = '';

      for (const line of lines) {
        const optionMatch = line.match(/^([A-D])\)\s*(.+)/);
        if (optionMatch) {
          options[optionMatch[1]] = optionMatch[2];
        }
        if (line.includes('**Correct Answer:**')) {
          correctAnswer = line.split('**Correct Answer:**')[1].trim().charAt(0);
        }
        if (line.includes('**Explanation:**')) {
          explanation = line.split('**Explanation:**')[1].trim();
        }
      }

      return { questionText, options, correctAnswer, explanation, index: idx };
    });
  };

  const questions = parseQuiz();

  const handleAnswer = (questionIndex: number, answer: string) => {
    if (!showResults) {
      setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  const downloadLesson = () => {
    const content = `# ${topic} - Complete Learning Package\n\n## Quiz\n\n${quiz}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '_')}_quiz.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const score = showResults
    ? questions.reduce((acc, q) => 
        acc + (selectedAnswers[q.index] === q.correctAnswer ? 1 : 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <Card className="border-chart-4/30 bg-gradient-to-br from-chart-4/5 to-chart-2/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Knowledge Assessment</CardTitle>
              <CardDescription>Test your understanding with these questions</CardDescription>
            </div>
            {showResults && (
              <Badge variant="secondary" className="text-base px-4 py-2">
                Score: {score}/{questions.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question) => {
            const userAnswer = selectedAnswers[question.index];
            const isCorrect = userAnswer === question.correctAnswer;
            const showFeedback = showResults && userAnswer;

            return (
              <Card key={question.index} className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-2">
                    <span className="text-muted-foreground">Q{question.index + 1}.</span>
                    <span className="flex-1">{question.questionText}</span>
                    {showFeedback && (
                      isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-chart-3 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                      )
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {Object.entries(question.options).map(([letter, text]) => {
                      const isSelected = userAnswer === letter;
                      const isCorrectAnswer = letter === question.correctAnswer;
                      const showAsCorrect = showResults && isCorrectAnswer;
                      const showAsWrong = showResults && isSelected && !isCorrect;

                      return (
                        <button
                          key={letter}
                          onClick={() => handleAnswer(question.index, letter)}
                          disabled={showResults}
                          data-testid={`quiz-option-${question.index}-${letter}`}
                          className={`
                            w-full text-left p-4 rounded-lg border-2 transition-all
                            ${isSelected && !showResults
                              ? 'border-primary bg-primary/10'
                              : showAsCorrect
                                ? 'border-chart-3 bg-chart-3/10'
                                : showAsWrong
                                  ? 'border-destructive bg-destructive/10'
                                  : 'border-card-border hover-elevate'
                            }
                            ${showResults ? 'cursor-default' : 'cursor-pointer active-elevate-2'}
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-semibold text-primary">{letter})</span>
                            <span className="flex-1">{text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showFeedback && question.explanation && (
                    <div className={`p-4 rounded-lg border ${
                      isCorrect
                        ? 'border-chart-3/30 bg-chart-3/5'
                        : 'border-destructive/30 bg-destructive/5'
                    }`}>
                      <p className="text-sm font-medium mb-1">Explanation:</p>
                      <p className="text-sm text-muted-foreground">{question.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex gap-3 pt-4">
            {!showResults ? (
              <Button
                onClick={handleSubmit}
                disabled={Object.keys(selectedAnswers).length < questions.length}
                className="flex-1"
                size="lg"
                data-testid="button-submit-quiz"
              >
                Submit Answers
              </Button>
            ) : (
              <>
                <Button onClick={handleReset} variant="outline" className="flex-1" size="lg">
                  Try Again
                </Button>
                <Button onClick={downloadLesson} variant="secondary" className="flex-1" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  Download Lesson
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
