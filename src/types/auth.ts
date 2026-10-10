export interface User { id: string; email: string; name?: string; role: 'admin' | 'viewer'; }
export interface AuthState { user: User | null; loading: boolean; error: Error | null; }