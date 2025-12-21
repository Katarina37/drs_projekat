import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { 
  ApiResponse, 
  AuthResponse, 
  User, 
  LoginCredentials, 
  RegisterData,
  Flight,
  Airline,
  CreateFlightData,
  Ticket,
  FlightRating
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const FLIGHT_API_URL = import.meta.env.VITE_FLIGHT_API_URL || 'http://localhost:5002/api';

// Create axios instances
const createApiInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for adding auth token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for handling errors
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse>) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const serverApi = createApiInstance(API_BASE_URL);
const flightApi = createApiInstance(FLIGHT_API_URL);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await serverApi.post<AuthResponse>('/auth/login', credentials);
    const payload = response.data;
    if (payload.user && !payload.data) {
      return { ...payload, data: payload.user };
    }
    return payload;
  },

  register: async (data: RegisterData): Promise<ApiResponse<User>> => {
    const response = await serverApi.post<ApiResponse<User>>('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await serverApi.post<ApiResponse>('/auth/logout');
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await serverApi.get<ApiResponse<User>>('/auth/profile');
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<ApiResponse<User[]>> => {
    const response = await serverApi.get<ApiResponse<User[]>>('/users/');
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<User>> => {
    const response = await serverApi.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await serverApi.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse> => {
    const response = await serverApi.delete<ApiResponse>(`/users/${id}`);
    return response.data;
  },

  changeRole: async (userId: number, novaUloga: string): Promise<ApiResponse<User>> => {
    const response = await serverApi.post<ApiResponse<User>>('/users/change-role', {
      user_id: userId,
      nova_uloga: novaUloga,
    });
    return response.data;
  },

  deposit: async (userId: number, iznos: number): Promise<ApiResponse<{ stanje_racuna: number }>> => {
    const response = await serverApi.post<ApiResponse<{ stanje_racuna: number }>>(
      `/users/${userId}/deposit`,
      { iznos }
    );
    return response.data;
  },
};

// Airlines API
export const airlinesApi = {
  getAll: async (): Promise<ApiResponse<Airline[]>> => {
    const response = await flightApi.get<ApiResponse<Airline[]>>('/airlines/');
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Airline>> => {
    const response = await flightApi.get<ApiResponse<Airline>>(`/airlines/${id}`);
    return response.data;
  },

  create: async (data: Partial<Airline>): Promise<ApiResponse<Airline>> => {
    const response = await flightApi.post<ApiResponse<Airline>>('/airlines/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Airline>): Promise<ApiResponse<Airline>> => {
    const response = await flightApi.put<ApiResponse<Airline>>(`/airlines/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse> => {
    const response = await flightApi.delete<ApiResponse>(`/airlines/${id}`);
    return response.data;
  },
};

// Flights API
export const flightsApi = {
  getAll: async (): Promise<ApiResponse<Flight[]>> => {
    const response = await flightApi.get<ApiResponse<Flight[]>>('/flights/');
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Flight>> => {
    const response = await flightApi.get<ApiResponse<Flight>>(`/flights/${id}`);
    return response.data;
  },

  getUpcoming: async (): Promise<ApiResponse<Flight[]>> => {
    const response = await flightApi.get<ApiResponse<Flight[]>>('/flights/upcoming');
    return response.data;
  },

  getInProgress: async (): Promise<ApiResponse<Flight[]>> => {
    const response = await flightApi.get<ApiResponse<Flight[]>>('/flights/in-progress');
    return response.data;
  },

  getFinished: async (): Promise<ApiResponse<Flight[]>> => {
    const response = await flightApi.get<ApiResponse<Flight[]>>('/flights/finished');
    return response.data;
  },

  getPending: async (): Promise<ApiResponse<Flight[]>> => {
    const response = await flightApi.get<ApiResponse<Flight[]>>('/flights/pending');
    return response.data;
  },

  getMyFlights: async (): Promise<ApiResponse<Flight[]>> => {
    const response = await flightApi.get<ApiResponse<Flight[]>>('/flights/my');
    return response.data;
  },

  create: async (data: CreateFlightData): Promise<ApiResponse<Flight>> => {
    const response = await flightApi.post<ApiResponse<Flight>>('/flights/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateFlightData>): Promise<ApiResponse<Flight>> => {
    const response = await flightApi.put<ApiResponse<Flight>>(`/flights/${id}`, data);
    return response.data;
  },

  approve: async (id: number): Promise<ApiResponse<Flight>> => {
    const response = await flightApi.post<ApiResponse<Flight>>(`/flights/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, razlog: string): Promise<ApiResponse<Flight>> => {
    const response = await flightApi.post<ApiResponse<Flight>>(`/flights/${id}/reject`, { razlog });
    return response.data;
  },

  cancel: async (id: number): Promise<ApiResponse<Flight>> => {
    const response = await flightApi.post<ApiResponse<Flight>>(`/flights/${id}/cancel`);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse> => {
    const response = await flightApi.delete<ApiResponse>(`/flights/${id}`);
    return response.data;
  },

  search: async (params: { naziv?: string; airline_id?: number }): Promise<ApiResponse<Flight[]>> => {
    const response = await flightApi.get<ApiResponse<Flight[]>>('/flights/search', { params });
    return response.data;
  },

  generateReport: async (type: string): Promise<ApiResponse> => {
    const response = await flightApi.post<ApiResponse>('/flights/report', { report_type: type });
    return response.data;
  },
};

// Tickets API
export const ticketsApi = {
  getMyTickets: async (): Promise<ApiResponse<Ticket[]>> => {
    const response = await flightApi.get<ApiResponse<Ticket[]>>('/tickets/my');
    return response.data;
  },

  buyTicket: async (flightId: number): Promise<ApiResponse<Ticket>> => {
    const response = await flightApi.post<ApiResponse<Ticket>>('/tickets/buy', { flight_id: flightId });
    return response.data;
  },

  cancelTicket: async (ticketId: number): Promise<ApiResponse> => {
    const response = await flightApi.post<ApiResponse>(`/tickets/${ticketId}/cancel`);
    return response.data;
  },
};

// Ratings API
export const ratingsApi = {
  getAll: async (): Promise<ApiResponse<FlightRating[]>> => {
    const response = await flightApi.get<ApiResponse<FlightRating[]>>('/ratings/');
    return response.data;
  },

  rateFlight: async (flightId: number, ocena: number, komentar?: string): Promise<ApiResponse<FlightRating>> => {
    const response = await flightApi.post<ApiResponse<FlightRating>>('/ratings/', {
      flight_id: flightId,
      ocena,
      komentar,
    });
    return response.data;
  },
};
