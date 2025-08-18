// Generic API Response Types
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta: Record<string, any>;
  timestamp: string;
}

export interface ErrorDetails {
  field?: string;
  value?: any;
  reason?: string;
  [key: string]: any;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: ErrorDetails | Record<string, any>;
  };
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
  timestamp: string;
}

export interface NoContentResponse {
  success: true;
  data: null;
  timestamp: string;
}

export interface CreatedResponse<T = any> {
  success: true;
  data: T;
  meta: {
    location?: string;
  };
  timestamp: string;
}

// Function declarations
export declare function success<T = any>(
  data: T, 
  meta?: Record<string, any>
): SuccessResponse<T>;

export declare function error(
  code: string, 
  message: string, 
  details?: ErrorDetails | Record<string, any>
): ErrorResponse;

export declare function paginated<T = any>(
  data: T[], 
  page: number, 
  limit: number, 
  total: number
): PaginatedResponse<T>;

export declare function noContent(): NoContentResponse;

export declare function created<T = any>(
  data: T, 
  location?: string | null
): CreatedResponse<T>;