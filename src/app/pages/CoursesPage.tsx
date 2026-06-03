import { Button } from '../components/Button';
import { Clock, BookOpen, User } from 'lucide-react';

interface CoursesPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export function CoursesPage({ onNavigate }: CoursesPageProps) {
  const courses = [
    {
      id: 1,
      title: 'Introduction to Psychological First Aid',
      instructor: 'Dr. Maria Santos',
      duration: '4 weeks',
      hours: '12 hours',
      price: 2500,
      thumbnail: '🧠',
      enrolled: 234
    },
    {
      id: 2,
      title: 'Mindfulness for Workplace Wellness',
      instructor: 'Prof. Juan Reyes',
      duration: '6 weeks',
      hours: '18 hours',
      price: 3500,
      thumbnail: '🧘',
      enrolled: 456
    },
    {
      id: 3,
      title: 'Effective Communication Strategies',
      instructor: 'Anna Rodriguez',
      duration: '3 weeks',
      hours: '10 hours',
      price: 2000,
      thumbnail: '💬',
      enrolled: 189
    },
    {
      id: 4,
      title: 'Leadership Development Essentials',
      instructor: 'Michael Tan',
      duration: '8 weeks',
      hours: '24 hours',
      price: 4500,
      thumbnail: '👔',
      enrolled: 312
    },
    {
      id: 5,
      title: 'Stress Management Techniques',
      instructor: 'Dr. Sarah Cruz',
      duration: '4 weeks',
      hours: '12 hours',
      price: 2500,
      thumbnail: '🌿',
      enrolled: 567
    },
    {
      id: 6,
      title: 'Conflict Resolution Skills',
      instructor: 'Carlos Mendoza',
      duration: '5 weeks',
      hours: '15 hours',
      price: 3000,
      thumbnail: '🤝',
      enrolled: 278
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="mb-4 text-primary">Online Courses</h1>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Self-paced learning programs designed by experts in psychology and organizational development
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 h-40 flex items-center justify-center text-6xl">
                {course.thumbnail}
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-primary">{course.title}</h3>
                <div className="flex items-center gap-2 text-sm text-foreground/60 mb-4">
                  <User className="w-4 h-4" />
                  <span>{course.instructor}</span>
                </div>
                <div className="flex flex-wrap gap-3 mb-4 text-sm text-foreground/60">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{course.hours}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-2xl text-primary" style={{ fontWeight: 700 }}>₱{course.price.toLocaleString()}</p>
                    <p className="text-xs text-foreground/60">{course.enrolled} enrolled</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => onNavigate('course-player', course)}
                  >
                    Enroll Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
