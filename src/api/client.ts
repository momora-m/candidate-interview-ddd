export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('APIサーバーに接続できません。', 0);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      issues?: { path?: unknown; message?: unknown }[];
    };
    const headline = typeof body.error === 'string' ? body.error : '';
    const details = Array.isArray(body.issues)
      ? body.issues
          .map((issue) => {
            const path = typeof issue.path === 'string' ? issue.path : '';
            const message = typeof issue.message === 'string' ? issue.message : '';
            if (path && message) {
              return `${path}: ${message}`;
            }
            return message || path;
          })
          .filter((line) => line.length > 0)
      : [];
    if (headline && details.length > 0) {
      return `${headline} ${details.join(' / ')}`;
    }
    if (headline.length > 0) {
      return headline;
    }
  } catch {
    // Non-JSON bodies (proxy errors, empty responses) fall through.
  }
  return `APIリクエストに失敗しました (${response.status})。`;
}
