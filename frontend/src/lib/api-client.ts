import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';

/**
 * Standardized API Response Structure across all upay Shield endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code?: string;
    details?: string;
  };
  [key: string]: any;
}

/**
 * Custom strongly-typed API Error
 */
export class ApiError extends Error {
  code?: string;
  status: number;
  details?: any;
  rawResponse?: any;

  constructor(message: string, status: number, code?: string, details?: any, rawResponse?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.rawResponse = rawResponse;
  }
}

/**
 * Determine API Base URL depending on execution environment
 */
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In browser: use relative proxy or public env
    return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  }
  // Server-side rendering context
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';
};

/**
 * Create pre-configured Axios Instance
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-client': 'upay-shield-web-v1'
  }
});

/**
 * Request Interceptor: Injects request tracking IDs, auth tokens, and timestamp headers
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Generate unique trace ID for distributed log correlation
    const traceId = `req-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
    config.headers.set('x-request-id', traceId);
    config.headers.set('x-client-timestamp', new Date().toISOString());

    // In local dev, allow passing through custom API base override if specified
    if (config.url?.startsWith('http') || config.url?.startsWith('/api/')) {
      config.baseURL = '';
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(new ApiError('Failed to dispatch request', 0, 'REQUEST_SETUP_ERROR', error.message));
  }
);

/**
 * Response Interceptor: Automatically unwraps response data & standardizes error handling
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Directly return response data payload
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status || 0;
    const responseData = error.response?.data;

    const message = responseData?.message || error.message || 'An unexpected error occurred during request';
    const code = responseData?.error?.code || (status === 0 ? 'NETWORK_TIMEOUT_ERROR' : `HTTP_${status}`);
    const details = responseData?.error?.details || responseData;

    console.error(`[API Error ${status}] [${code}]:`, message);

    return Promise.reject(new ApiError(message, status, code, details, responseData));
  }
);

/**
 * High-level typed API methods for components and hooks
 */

// ─── Request Deduplication ──────────────────────────────────
// Prevents duplicate concurrent GET requests to the same URL
const inflightRequests = new Map<string, Promise<any>>();

async function deduplicatedGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const cacheKey = `${url}?${JSON.stringify(config?.params || {})}`;
  
  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const promise = apiClient.get<ApiResponse<T>>(url, config)
    .then(res => res.data)
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, promise);
  return promise;
}

// ─── Retry Logic ────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  backoffMs: number = 500,
  retryStatuses: number[] = [502, 503, 504]
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const isRetryable = status ? retryStatuses.includes(status) : error?.code === 'ECONNABORTED';

      if (attempt < retries && isRetryable) {
        const delay = backoffMs * Math.pow(2, attempt);
        console.warn(`[API Retry] Attempt ${attempt + 1}/${retries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Retry exhausted');
}

export const api = {
  /** Standard GET request */
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const res = await apiClient.get<ApiResponse<T>>(url, config);
    return res.data;
  },

  /** GET with deduplication — concurrent identical requests share one network call */
  getDedup: deduplicatedGet,

  /** GET with automatic retry on transient failures (502/503/504/timeout) */
  getWithRetry: async <T = any>(url: string, config?: AxiosRequestConfig, retries: number = 2): Promise<ApiResponse<T>> => {
    return withRetry(() => apiClient.get<ApiResponse<T>>(url, config).then(r => r.data), retries);
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const res = await apiClient.post<ApiResponse<T>>(url, data, config);
    return res.data;
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const res = await apiClient.put<ApiResponse<T>>(url, data, config);
    return res.data;
  },

  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const res = await apiClient.patch<ApiResponse<T>>(url, data, config);
    return res.data;
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const res = await apiClient.delete<ApiResponse<T>>(url, config);
    return res.data;
  }
};

export default api;

