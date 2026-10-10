// Production browsers call the Ubuntu API directly.
// The proxy is bypassed due to Node.js DNS/IPv6 ETIMEDOUT issues on some local networks.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.madesh.in/api/v1';
import { auth } from '../contexts/AuthContext';

async function buildHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    ...(customHeaders || {})
  };

  const apiToken = import.meta.env.VITE_API_TOKEN;
  if (apiToken) {
    headers['x-api-token'] = apiToken;
  }

  try {
    await auth.authStateReady();
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (tokenErr) {
    console.warn('[API] Auth resolution warning:', tokenErr);
  }

  return headers;
}

export const apiClient = {
  get: async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    try {
      const headers = await buildHeaders(options?.headers as Record<string, string>);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers,
        signal: options?.signal,
      });

      if (!response.ok) {
        console.warn(`[API GET] ${endpoint} returned ${response.status}.`);
        const err = new Error(`API Error: ${response.status}`);
        (err as any).status = response.status;
        throw err;
      }

      let data = await response.json();
      
      // Unwrap standard API envelopes (e.g. { data: {...}, timestamp: ... })
      if (data && typeof data === 'object' && 'data' in data && 'timestamp' in data) {
        data = data.data;
      }
      
      return data as T;
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      if (error.status) throw error; // Re-throw if it's our structured error
      console.warn(`[API GET] ${endpoint} failed to fetch.`);
      const err = new Error('Network Error');
      (err as any).status = 0;
      throw err;
    }
  },

  post: async <T>(endpoint: string, data: any, options?: RequestInit): Promise<T> => {
    try {
      const baseHeaders = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {})
      };
      const headers = await buildHeaders(baseHeaders);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: options?.signal,
      });

      if (!response.ok) {
        console.warn(`[API POST] ${endpoint} returned ${response.status}.`);
        let errorData: any = null;
        try { errorData = await response.json(); } catch (_) {}
        const msg = errorData?.error?.message || errorData?.detail || errorData?.message || `API Error: ${response.status}`;
        const err = new Error(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
        (err as any).status = response.status;
        throw err;
      }

      let responseData = await response.json();
      if (responseData && typeof responseData === 'object' && 'data' in responseData && 'timestamp' in responseData) {
        responseData = responseData.data;
      }
      return responseData as T;
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      if (error.status) throw error; 
      console.warn(`[API POST] ${endpoint} failed to fetch.`);
      const err = new Error(error?.message || 'Network Error');
      (err as any).status = 0;
      throw err;
    }
  },

  put: async <T>(endpoint: string, data: any, options?: RequestInit): Promise<T> => {
    try {
      const baseHeaders = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {})
      };
      const headers = await buildHeaders(baseHeaders);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        signal: options?.signal,
      });

      if (!response.ok) {
        console.warn(`[API PUT] ${endpoint} returned ${response.status}.`);
        let errorData: any = null;
        try { errorData = await response.json(); } catch (_) {}
        const msg = errorData?.error?.message || errorData?.detail || errorData?.message || `API Error: ${response.status}`;
        const err = new Error(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
        (err as any).status = response.status;
        throw err;
      }

      let responseData = await response.json();
      if (responseData && typeof responseData === 'object' && 'data' in responseData && 'timestamp' in responseData) {
        responseData = responseData.data;
      }
      return responseData as T;
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      if (error.status) throw error; 
      console.warn(`[API PUT] ${endpoint} failed to fetch.`);
      const err = new Error(error?.message || 'Network Error');
      (err as any).status = 0;
      throw err;
    }
  },

  patch: async <T>(endpoint: string, data: any, options?: RequestInit): Promise<T> => {
    try {
      const baseHeaders = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {})
      };
      const headers = await buildHeaders(baseHeaders);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
        signal: options?.signal,
      });

      if (!response.ok) {
        console.warn(`[API PATCH] ${endpoint} returned ${response.status}.`);
        let errorData: any = null;
        try { errorData = await response.json(); } catch (_) {}
        const msg = errorData?.error?.message || errorData?.detail || errorData?.message || `API Error: ${response.status}`;
        const err = new Error(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
        (err as any).status = response.status;
        throw err;
      }

      let responseData = await response.json();
      if (responseData && typeof responseData === 'object' && 'data' in responseData && 'timestamp' in responseData) {
        responseData = responseData.data;
      }
      return responseData as T;
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      if (error.status) throw error; 
      console.warn(`[API PATCH] ${endpoint} failed to fetch.`);
      const err = new Error(error?.message || 'Network Error');
      (err as any).status = 0;
      throw err;
    }
  },
  
  delete: async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    try {
      const headers = await buildHeaders(options?.headers as Record<string, string>);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers,
        signal: options?.signal,
      });

      if (!response.ok) {
        console.warn(`[API DELETE] ${endpoint} returned ${response.status}.`);
        let errorData: any = null;
        try { errorData = await response.json(); } catch (_) {}
        const msg = errorData?.error?.message || errorData?.detail || errorData?.message || `API Error: ${response.status}`;
        const err = new Error(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
        (err as any).status = response.status;
        throw err;
      }

      let responseData: any = null;
      try {
        responseData = await response.json();
      } catch (_) {
        return {} as T;
      }
      if (responseData && typeof responseData === 'object' && 'data' in responseData && 'timestamp' in responseData) {
        responseData = responseData.data;
      }
      return responseData as T;
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      if (error.status) throw error; 
      console.warn(`[API DELETE] ${endpoint} failed to fetch.`);
      const err = new Error(error?.message || 'Network Error');
      (err as any).status = 0;
      throw err;
    }
  }
};
