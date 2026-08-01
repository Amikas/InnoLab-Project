// For server-side rendering in Docker, use the service name 'app'
// For client-side (browser), use localhost or the NEXT_PUBLIC_API_URL proxy
const getApiBaseUrl = () => {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;

  // Server-side (SSR / build): must return an absolute URL that Node can fetch.
  if (typeof window === "undefined") {
    // Prefer explicit API_URL for server-side calls
    if (process.env.API_URL) return process.env.API_URL;

    // If NEXT_PUBLIC_API_URL is an absolute URL, it's safe to use on the server
    if (publicUrl && /^https?:\/\//i.test(publicUrl)) return publicUrl;

    // Fallback to the commonly used backend address during development/docker
    return "http://localhost:8080";
  }

  // Client-side: allow a relative proxy (e.g. '/api') or an explicit public URL.
  return publicUrl || "";
};

// Helper function to extract filename from Content-Disposition header
function extractFilenameFromHeaders(headers: Headers): string | null {
  const contentDisposition = headers.get("Content-Disposition");
  if (!contentDisposition) return null;

  // Try different patterns for filename extraction
  const patterns = [
    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
    /filename\*?=["']?([^"'\n]+)["']?/i,
    /filename\*?=([^;\n]+)/,
  ];

  for (const pattern of patterns) {
    const matches = contentDisposition.match(pattern);
    if (matches && matches[1]) {
      // Clean up the filename (remove quotes, handle UTF-8 encoding, etc.)
      let filename = matches[1].replace(/['"]/g, "");

      // Handle RFC 5987 encoded filenames (filename*=UTF-8''...)
      if (filename.startsWith("UTF-8''")) {
        filename = decodeURIComponent(filename.substring(7));
      }

      return filename;
    }
  }

  return null;
}

export class ApiClient {
  private getBaseUrl(): string {
    return getApiBaseUrl();
  }

  // Main request method for JSON responses
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    // Let browser define multipart boundaries for FormData automatically.
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: "include", // Send cookies with every request
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // The backend always puts user-safe text in `error`. Raw internals (paths,
      // stack fragments) may live under `message`/`details`, so those are only
      // ever surfaced for the whitelisted client-error statuses — never for 5xx.
      const serverMsg: string | undefined = errorData.error || errorData.message;
      if ([400, 401, 403, 404, 409, 429, 503].includes(response.status)) {
        throw new Error(serverMsg || "Authentication required");
      }
      throw new Error(errorData.error || `Request failed (${response.status})`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    return text as T;
  }

  // Method for blob/binary responses (file downloads)
  async requestBlob(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ blob: Blob; filename?: string }> {
    const url = `${this.getBaseUrl()}${endpoint}`;

    const config: RequestInit = {
      headers: {
        Accept: "application/octet-stream, */*",
        ...options.headers,
      },
      credentials: "include",
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      // Try to parse error as JSON first, fall back to text
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorText = await response.text();
        // Try to parse as JSON
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Not JSON, use as text
          errorMessage = errorText || errorMessage;
        }
      } catch (e) {
        // Couldn't read response body
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const filename = extractFilenameFromHeaders(response.headers);

    return { blob, filename };
  }

  // Convenience method for downloading files with automatic trigger
  async downloadFile(
    endpoint: string,
    defaultFilename?: string,
  ): Promise<void> {
    const { blob, filename } = await this.requestBlob(endpoint);

    // Determine the final filename
    const finalFilename = filename || defaultFilename || "download";

    // Create and trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Convenience methods
  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }

  // Method to get blob without triggering download (for previews, etc.)
  async getBlob(endpoint: string): Promise<Blob> {
    const { blob } = await this.requestBlob(endpoint);
    return blob;
  }
}

export const apiClient = new ApiClient();
