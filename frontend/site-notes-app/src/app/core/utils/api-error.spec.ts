import { HttpErrorResponse } from '@angular/common/http';
import { API_OFFLINE_MESSAGE, apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('usa o detail do ProblemDetails', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { title: 'Regra de negocio violada.', detail: 'Url e obrigatoria.' },
    });

    expect(apiErrorMessage(error, 'fallback')).toBe('Url e obrigatoria.');
  });

  it('avisa que a API esta fora do ar quando nao ha resposta', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }), 'fallback')).toBe(
      API_OFFLINE_MESSAGE,
    );
  });

  it('usa o fallback quando nao ha detail', () => {
    const notFound = new HttpErrorResponse({
      status: 404,
      error: { title: 'Recurso nao encontrado.' },
    });
    const blank = new HttpErrorResponse({ status: 400, error: { detail: '  ' } });
    const text = new HttpErrorResponse({ status: 500, error: 'Internal Server Error' });

    expect(apiErrorMessage(notFound, 'fallback')).toBe('fallback');
    expect(apiErrorMessage(blank, 'fallback')).toBe('fallback');
    expect(apiErrorMessage(text, 'fallback')).toBe('fallback');
  });

  it('usa o fallback para erros que nao sao HTTP', () => {
    expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(apiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
