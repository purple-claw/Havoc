// HAVOC API Client — connects the frontend to the backend
// Handles all HTTP communication with graceful error handling

import type { ExecuteResponse, GallerySnippet } from '../types/animation.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class HavocAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  /** Execute code and get full visualization data */
  async execute(
    code: string,
    options: {
      adapter_hint?: string;
      generate_explanations?: boolean;
      explain?: boolean;
      max_steps?: number;
      speed_preset?: string;
    } = {}
  ): Promise<ExecuteResponse> {
    return this.request<ExecuteResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify({
        code,
        generate_explanations: true,
        max_steps: 100_000,
        speed_preset: 'normal',
        ...options,
      }),
    });
  }

  /** Quick execution — fast preview without AI explanations */
  async quickExecute(code: string): Promise<any> {
    return this.request('/execute/quick', {
      method: 'POST',
      body: JSON.stringify({ code, generate_explanations: false, max_steps: 1000 }),
    });
  }

  /** Get the algorithm gallery grouped by category */
  async getGallery(): Promise<GallerySnippet[]> {
    return this.request('/snippets/gallery');
  }

  /** Get a specific gallery snippet with full code */
  async getGallerySnippet(id: string): Promise<GallerySnippet> {
    return this.request(`/snippets/gallery/${id}`);
  }

  /** Save a user snippet */
  async saveSnippet(snippet: { title: string; code: string; description?: string; tags?: string[] }): Promise<any> {
    return this.request('/snippets', {
      method: 'POST',
      body: JSON.stringify(snippet),
    });
  }

  /** Create a share link */
  async share(code: string, title?: string): Promise<{ share_id: string; share_url: string }> {
    return this.request('/share', {
      method: 'POST',
      body: JSON.stringify({ code, title }),
    });
  }

  /** Load a shared visualization */
  async getShared(shareId: string): Promise<any> {
    return this.request(`/share/${shareId}`);
  }

  /** Get list of available adapters */
  async getAdapters(): Promise<{ adapters: any[] }> {
    return this.request('/adapters');
  }

  /** Health check */
  async health(): Promise<any> {
    return this.request('/health');
  }
}

export const api = new HavocAPI();
export default HavocAPI;
