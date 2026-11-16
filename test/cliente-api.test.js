import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buscarPorDocumento } from '../src/cliente-api.js';

/**
 * Contrato com GET /internal/clientes do OS Service (ADR 011): URL, header do
 * token interno e tradução de cada resposta.
 */

const resposta = (status, corpo) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => corpo,
});

describe('consulta do cliente no OS Service', () => {
  let fetchMock;

  beforeEach(() => {
    process.env.OS_URL_INTERNA = 'http://os-interno.vpc.local/';
    process.env.INTERNAL_TOKEN = 'segredo-compartilhado';
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('chama a rota interna com o documento e o token', async () => {
    fetchMock.mockResolvedValueOnce(
      resposta(200, { id: 'c-1', nome: 'Alice', ativo: true, extra: 'ignorado' }),
    );

    const cliente = await buscarPorDocumento('52998224725');

    expect(cliente).toEqual({ id: 'c-1', nome: 'Alice', ativo: true });
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toBe('http://os-interno.vpc.local/internal/clientes?documento=52998224725');
    expect(opcoes.headers['X-Internal-Token']).toBe('segredo-compartilhado');
    expect(opcoes.signal).toBeDefined(); // tem timeout
  });

  it('404 é cliente inexistente', async () => {
    fetchMock.mockResolvedValueOnce(resposta(404));
    expect(await buscarPorDocumento('52998224725')).toBeNull();
  });

  it('cliente inativo continua sendo devolvido, com ativo=false', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, { id: 'c-2', nome: 'Bia', ativo: false }));
    expect((await buscarPorDocumento('52998224725')).ativo).toBe(false);
  });

  it('403 (token divergente) e 5xx viram erro, não "cliente inexistente"', async () => {
    fetchMock.mockResolvedValueOnce(resposta(403));
    await expect(buscarPorDocumento('52998224725')).rejects.toThrow('respondeu 403');

    fetchMock.mockResolvedValueOnce(resposta(503));
    await expect(buscarPorDocumento('52998224725')).rejects.toThrow('respondeu 503');
  });

  it('OS Service fora do ar vira erro com a causa', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('connect ECONNREFUSED'), { name: 'TypeError' }));
    await expect(buscarPorDocumento('52998224725')).rejects.toThrow('OS Service inalcançável');
  });

  it('sem configuração, falha avisando qual variável falta', async () => {
    delete process.env.OS_URL_INTERNA;
    await expect(buscarPorDocumento('52998224725')).rejects.toThrow('OS_URL_INTERNA');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
