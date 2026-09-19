function resolveApiBaseUrl(): string {
  // ng serve local continua falando com a API na porta 5210
  if (typeof location !== 'undefined' && location.port === '4200') {
    return 'http://localhost:5210/api';
  }

  // Docker / nginx: mesmo host (ex.: https://sitenotes/api)
  return '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
