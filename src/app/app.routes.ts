import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/tasks',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'tasks',
    loadComponent: () => import('./components/task-list/task-list.component').then(m => m.TaskListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tasks/new',
    loadComponent: () => import('./components/task-form/task-form.component').then(m => m.TaskFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tasks/:id',
    loadComponent: () => import('./components/task-detail/task-detail.component').then(m => m.TaskDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tasks/:id/edit',
    loadComponent: () => import('./components/task-form/task-form.component').then(m => m.TaskFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'insights',
    loadComponent: () => import('./components/insights-dashboard/insights-dashboard.component').then(m => m.InsightsDashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'focus',
    loadComponent: () => import('./components/focus-mode/focus-mode.component').then(m => m.FocusModeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/productivity-report/productivity-report.component').then(m => m.ProductivityReportComponent),
    canActivate: [authGuard]
  },
  {
    path: 'kanban',
    loadComponent: () => import('./components/kanban-view/kanban-view.component').then(m => m.KanbanViewComponent),
    canActivate: [authGuard]
  }
];
