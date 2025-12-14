# TaskFlow AI - Intelligent Task Management System

A comprehensive, AI-powered task management application built with Angular 21, featuring smart suggestions, productivity analytics, gamification, and advanced task management capabilities.

![Angular](https://img.shields.io/badge/Angular-21.0-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### Core Features
- **Task Management**: Create, edit, delete, and organize tasks with rich metadata
- **Authentication**: Secure login/logout with route guards
- **Multiple Views**: List view, Kanban board view
- **Advanced Filtering**: Filter by status, category, priority, and tags
- **Smart Search**: Real-time search with debouncing

### AI & Smart Features
- **Smart Task Suggestions**: NLP-based parsing for natural language task creation
- **Priority Prediction**: ML-like algorithm for automatic priority scoring
- **Intelligent Scheduling**: Optimal task time suggestions based on productivity patterns
- **Duplicate Detection**: Automatically detect and warn about duplicate tasks
- **Task Templates**: Create and reuse task templates for common workflows

### Analytics & Insights
- **Productivity Dashboard**: Comprehensive analytics with charts and visualizations
- **Productivity Metrics**: Score calculation, completion rates, task velocity
- **Trend Analysis**: Track productivity over time
- **Category Performance**: Breakdown by category with completion rates
- **Peak Hours Detection**: Identify your most productive hours
- **Burnout Risk Detection**: Workload analysis and recommendations

### Gamification
- **Achievement System**: Unlock badges for various accomplishments
- **Streak Tracking**: Daily completion streaks with milestones
- **Level System**: XP-based progression with level rewards
- **Achievement Types**: Completion, streak, category, time, speed, consistency, mastery

### Advanced Task Features
- **Subtasks**: Nested subtask support with progress tracking
- **Task Dependencies**: Define task dependencies with circular dependency detection
- **Multi-Tag System**: Tag tasks with autocomplete and tag-based filtering
- **Time Tracking**: Track time spent on tasks with start/stop timer
- **Rich Task Details**: Notes, attachments, reminders, location

### Productivity Tools
- **Focus Mode**: Distraction-free Pomodoro timer integration
- **Pomodoro Timer**: 25-minute work sessions with breaks
- **Time Tracking**: Automatic time tracking during focus sessions
- **Productivity Reports**: Daily, weekly, and monthly reports
- **Export/Import**: Export tasks as JSON/CSV, import from files

### UI/UX Enhancements
- **Smooth Animations**: Fade-in, slide-in, and micro-interactions
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Beautiful gradient designs and intuitive interface
- **Performance Optimized**: OnPush change detection, signals, lazy loading
- **Offline Support**: IndexedDB caching with sync queue

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (v21)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/taskflow-ai.git
cd taskflow-ai
```

2. Install dependencies:
```bash
npm install
```

3. Install JSON Server globally (if not already installed):
```bash
npm install -g json-server
```

## 🚀 Running the Application

### Start JSON Server (Backend)
Open a terminal and run:
```bash
npm run json-server
```
This starts the JSON Server on `http://localhost:3000`

### Start Angular Development Server
Open another terminal and run:
```bash
npm start
```
Or:
```bash
ng serve
```
The application will be available at `http://localhost:4200`

## 🔐 Login Credentials

Default login credentials:
- **Email**: `admin@taskapp.com`
- **Password**: `admin123`

Or:
- **Email**: `user@taskapp.com`
- **Password**: `user123`

## 📁 Project Structure

```
src/app/
├── components/
│   ├── task-list/           # Main task list view
│   ├── task-detail/         # Task detail view with dependencies
│   ├── task-form/           # Create/edit task form
│   ├── login/               # Login component
│   ├── navigation/          # Navigation bar
│   ├── insights-dashboard/  # Analytics dashboard
│   ├── productivity-report/ # Reports component
│   ├── focus-mode/          # Pomodoro focus mode
│   ├── kanban-view/         # Kanban board view
│   └── subtask-list/        # Subtasks component
├── services/
│   ├── task.service.ts
│   ├── auth.service.ts
│   ├── analytics.service.ts
│   ├── smart-suggestions.service.ts
│   ├── priority-prediction.service.ts
│   ├── scheduling.service.ts
│   ├── template.service.ts
│   ├── achievement.service.ts
│   ├── streak.service.ts
│   ├── time-tracking.service.ts
│   ├── tag.service.ts
│   ├── dependency.service.ts
│   └── export-import.service.ts
├── models/
│   ├── task.model.ts
│   ├── user.model.ts
│   ├── subtask.model.ts
│   ├── template.model.ts
│   ├── achievement.model.ts
│   ├── user-stats.model.ts
│   └── insight.model.ts
├── utils/
│   ├── nlp-parser.util.ts
│   ├── priority-calculator.util.ts
│   ├── time-estimator.util.ts
│   └── productivity-calculator.util.ts
├── guards/
│   └── auth.guard.ts
└── interceptors/
    └── auth.interceptor.ts
```

## 🎯 Key Angular Concepts Used

- **Standalone Components**: All components are standalone
- **Signals**: Reactive state management with Angular Signals
- **Computed Properties**: Derived state from signals
- **OnPush Change Detection**: Performance optimization
- **Lazy Loading**: Route-based code splitting
- **Reactive Forms**: Form validation and handling
- **HTTP Client**: API communication
- **Route Guards**: Authentication protection
- **HTTP Interceptors**: Request/response handling
- **Chart.js Integration**: Data visualization
- **Service Workers**: PWA support with offline capabilities

## 📊 API Endpoints

The application uses JSON Server with the following endpoints:

- `GET /tasks` - Get all tasks
- `GET /tasks/:id` - Get task by ID
- `POST /tasks` - Create new task
- `PATCH /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `GET /users` - Get users (for authentication)
- `GET /templates` - Get task templates
- `GET /userStats` - Get user statistics
- `GET /achievements` - Get achievements
- `GET /insights` - Get productivity insights

## 🎨 Features in Detail

### Smart Suggestions
- Natural language parsing for task creation
- Auto-detect dates, times, categories, and priorities
- Suggest related tasks
- Detect duplicate tasks

### Priority Prediction
- Analyzes task content, due dates, and user history
- Considers workload and dependencies
- Auto-adjusts priority based on approaching deadlines

### Analytics Dashboard
- Productivity score (0-100)
- Completion rate tracking
- Category performance breakdown
- Peak productivity hours
- Burnout risk assessment
- Trend visualization with charts

### Focus Mode
- Pomodoro timer (25 min work, 5 min break, 15 min long break)
- Distraction-free interface
- Automatic time tracking
- Task selection and completion

### Task Dependencies
- Define task dependencies
- Circular dependency detection
- Block completion until dependencies are met
- Visual dependency display

## 🚧 Development

### Build for Production
```bash
ng build --configuration production
```

### Run Tests
```bash
ng test
```

### Linting
```bash
ng lint
```

## 📦 Dependencies

Key dependencies:
- `@angular/core`: ^21.0.0
- `@angular/common`: ^21.0.0
- `@angular/router`: ^21.0.0
- `@angular/forms`: ^21.0.0
- `rxjs`: ^7.8.0
- `chart.js`: ^4.5.1
- `ng2-charts`: ^8.0.0
- `date-fns`: ^4.1.0
- `json-server`: ^1.0.0-beta.3

## 🎓 Learning Outcomes

This project demonstrates:
- Modern Angular development practices
- Reactive programming with RxJS
- State management with Signals
- Performance optimization techniques
- AI/ML-like algorithms implementation
- Data visualization
- Gamification systems
- Complex UI/UX patterns
- Offline-first architecture
- PWA implementation

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/taskflow-ai/issues).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Built as a comprehensive Angular assignment demonstrating advanced features and best practices.

## 🙏 Acknowledgments

- Angular team for the amazing framework
- Chart.js for data visualization
- JSON Server for the mock backend
- All open-source contributors

---

**Note**: Make sure JSON Server is running on port 3000 before using the application.

For questions or support, please open an issue on GitHub.
