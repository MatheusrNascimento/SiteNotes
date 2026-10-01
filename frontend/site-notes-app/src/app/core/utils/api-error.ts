import { HttpErrorResponse } from '@angular/common/http';

export const API_OFFLINE_MESSAGE =
  'Nao foi possivel falar com a API. Verifique se ela esta rodando.';

/**
 * Mensagem para o usuario a partir de um erro HTTP: o `detail` do ProblemDetails (regras de
 * negocio, 400), o aviso de API fora do ar (status 0) ou o `fallback` da tela.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return API_OFFLINE_MESSAGE;
  }

  const detail: unknown = (error.error as { detail?: unknown } | null)?.detail;
  return typeof detail === 'string' && detail.trim() ? detail : fallback;
}
