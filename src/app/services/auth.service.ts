import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { User, LoginCredentials, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_URL = 'http://localhost:3000/users';
  
  // Use signals for reactive state
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();
  
  isAuthenticated = signal<boolean>(this.hasToken());

  constructor(private router: Router) {
    // Check if user is still authenticated on service init
    if (!this.isAuthenticated()) {
      this.clearAuth();
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Simulate API call with delay
    return of(this.mockLogin(credentials)).pipe(
      delay(500), // Simulate network delay
      tap((response: AuthResponse) => {
        this.setAuth(response.user, response.token);
      })
    );
  }

  private mockLogin(credentials: LoginCredentials): AuthResponse {
    // In a real app, this would be an HTTP call
    // For demo: email: admin@taskapp.com, password: admin123
    const users = this.getStoredUsers();
    const user = users.find(u => 
      u.email === credentials.email && u.password === credentials.password
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const { password, ...userWithoutPassword } = user;
    const token = this.generateToken(user.id);

    return {
      user: userWithoutPassword,
      token
    };
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setAuth(user: Omit<User, 'password'>, token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user as User);
    this.isAuthenticated.set(true);
  }

  private clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticated.set(false);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  private getStoredUsers(): User[] {
    // In a real app, this would fetch from API
    // For now, return default users
    return [
      {
        id: 1,
        email: 'admin@taskapp.com',
        name: 'Admin User',
        password: 'admin123'
      },
      {
        id: 2,
        email: 'user@taskapp.com',
        name: 'Test User',
        password: 'user123'
      }
    ];
  }

  private generateToken(userId: number): string {
    // Simple token generation (in real app, use JWT)
    return `token_${userId}_${Date.now()}`;
  }
}

