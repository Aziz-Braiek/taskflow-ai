export interface User {
  id: number;
  email: string;
  name: string;
  password: string; // In real app, this would be hashed
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

