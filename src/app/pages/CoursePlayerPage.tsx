import { useState } from 'react';
import { Button } from '../components/Button';
import { ChevronRight, PlayCircle, FileText, CheckCircle, Lock } from 'lucide-react';

interface CoursePlayerPageProps {
  course: any;
  onNavigate: (page: string) => void;
}

export function CoursePlayerPage({ course, onNavigate }: CoursePlayerPageProps) {
  const [currentModule, setCurrentModule] = useState(0);
  const [currentLesson, setCurrentLesson] = useState(0);

  const modules = [
    {
      title: 'Introduction & Foundations',
      lessons: [
        { title: 'Welcome to the Course', duration: '5:30', completed: true },
        { title: 'Course Overview and Objectives', duration: '8:15', completed: true },
        { title: 'Key Concepts and Terminology', duration: '12:45', completed: false }
      ]
    },
    {
      title: 'Core Principles',
      lessons: [
        { title: 'Understanding the Framework', duration: '15:20', completed: false },
        { title: 'Theoretical Foundations', duration: '18:30', completed: false },
        { title: 'Practical Applications', duration: '14:10', completed: false }
      ]
    },
    {
      title: 'Advanced Topics',
      lessons: [
        { title: 'Case Study Analysis', duration: '20:45', completed: false },
        { title: 'Expert Interview', duration: '16:30', completed: false },
        { title: 'Best Practices', duration: '13:20', completed: false }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-foreground/60 mb-6">
          <button onClick={() => onNavigate('courses')} className="hover:text-primary">
            Courses
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-primary">{course.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden sticky top-24">
              <div className="bg-primary text-primary-foreground p-4">
                <h3>Course Content</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="border-b border-border">
                    <button
                      onClick={() => setCurrentModule(moduleIndex)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                    >
                      <p style={{ fontWeight: 600 }} className="text-sm">
                        Module {moduleIndex + 1}: {module.title}
                      </p>
                      <p className="text-xs text-foreground/60 mt-1">
                        {module.lessons.length} lessons
                      </p>
                    </button>
                    {currentModule === moduleIndex && (
                      <div className="bg-muted/50">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <button
                            key={lessonIndex}
                            onClick={() => setCurrentLesson(lessonIndex)}
                            className={`w-full px-6 py-3 text-left text-sm flex items-center justify-between hover:bg-muted transition-colors ${
                              currentModule === moduleIndex && currentLesson === lessonIndex
                                ? 'bg-primary/10 border-l-4 border-primary'
                                : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {lesson.completed ? (
                                <CheckCircle className="w-4 h-4 text-secondary" />
                              ) : lessonIndex <= currentLesson ? (
                                <PlayCircle className="w-4 h-4 text-primary" />
                              ) : (
                                <Lock className="w-4 h-4 text-foreground/40" />
                              )}
                              <span>{lesson.title}</span>
                            </div>
                            <span className="text-xs text-foreground/60">{lesson.duration}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="bg-gradient-to-br from-primary/20 to-secondary/20 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                  <p className="text-foreground/70">Video Player</p>
                  <p className="text-sm text-foreground/50 mt-2">
                    {modules[currentModule].lessons[currentLesson].title}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <h2 className="mb-2 text-primary">
                  {modules[currentModule].lessons[currentLesson].title}
                </h2>
                <p className="text-foreground/70 mb-4">
                  Module {currentModule + 1}, Lesson {currentLesson + 1}
                </p>
                <p className="text-foreground/80 leading-relaxed">
                  In this lesson, you'll learn about key concepts and practical applications.
                  The content is designed to be engaging and actionable, providing you with
                  tools and strategies you can immediately apply in your professional context.
                </p>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="mb-4 text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Lesson Notes
              </h3>
              <div className="space-y-3 text-sm text-foreground/80">
                <p>• Key takeaway: Understanding fundamental principles</p>
                <p>• Remember to practice the techniques discussed</p>
                <p>• Reflect on how this applies to your context</p>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="mb-4 text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Downloadable Resources
              </h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-3 bg-muted rounded-lg text-left hover:bg-muted/80 transition-colors text-sm">
                  📄 Lesson Workbook (PDF)
                </button>
                <button className="w-full px-4 py-3 bg-muted rounded-lg text-left hover:bg-muted/80 transition-colors text-sm">
                  📊 Practice Templates (XLSX)
                </button>
                <button className="w-full px-4 py-3 bg-muted rounded-lg text-left hover:bg-muted/80 transition-colors text-sm">
                  📝 Reflection Guide (DOCX)
                </button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentLesson > 0) {
                    setCurrentLesson(currentLesson - 1);
                  } else if (currentModule > 0) {
                    setCurrentModule(currentModule - 1);
                    setCurrentLesson(modules[currentModule - 1].lessons.length - 1);
                  }
                }}
                disabled={currentModule === 0 && currentLesson === 0}
              >
                Previous Lesson
              </Button>
              <Button
                onClick={() => {
                  if (currentLesson < modules[currentModule].lessons.length - 1) {
                    setCurrentLesson(currentLesson + 1);
                  } else if (currentModule < modules.length - 1) {
                    setCurrentModule(currentModule + 1);
                    setCurrentLesson(0);
                  }
                }}
              >
                {currentModule === modules.length - 1 &&
                 currentLesson === modules[currentModule].lessons.length - 1
                  ? 'Complete Course'
                  : 'Next Lesson'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
