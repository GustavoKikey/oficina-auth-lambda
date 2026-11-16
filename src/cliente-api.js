/**
 * Consulta do cliente no OS Service (fase 4, ADR 011 do OS Service).
 *
 * Até a fase 3 a função lia a tabela `clientes` direto do banco. Na fase 4 o
 * cliente pertence ao OS Service, e nenhum serviço acessa o banco de outro: a
 * função pergunta à rota interna dele,
 *
 *   GET {OS_URL_INTERNA}/internal/clientes?documento=52998224725
 *   X-Internal-Token: <segredo compartilhado>
 *
 *   200 { id, nome, ativo }   cliente encontrado (ativo ou não)
 *   404                       não existe
 *   403                       token errado — erro de configuração, não do cliente
 *
 * OS_URL_INTERNA é o load balancer INTERNO do OS Service (só alcançável de dentro
 * da VPC, onde a função roda). Ele e o token chegam como variáveis de ambiente,
 * injetadas pelo Terraform no apply a partir do SSM.
 */

const TIMEOUT_MS = Number(process.env.OS_TIMEOUT_MS ?? 5000);

/**
 * @param {string} documento CPF normalizado (só dígitos).
 * @returns {Promise<{id: string, nome: string, ativo: boolean} | null>}
 */
export async function buscarPorDocumento(documento) {
  const base = exigir('OS_URL_INTERNA').replace(/\/+$/, '');
  const url = `${base}/internal/clientes?documento=${encodeURIComponent(documento)}`;

  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { 'X-Internal-Token': exigir('INTERNAL_TOKEN'), Accept: 'application/json' },
      // Sem NAT, uma conexão pendurada seguraria a função até o timeout dela.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new Error(`OS Service inalcançável (${e.name}): ${e.message}`);
  }

  if (resposta.status === 404) {
    return null;
  }
  if (!resposta.ok) {
    // 403 aqui é token divergente entre a função e o OS Service: falha de
    // configuração, que deve aparecer como erro (500), não como "CPF inválido".
    throw new Error(`OS Service respondeu ${resposta.status} em /internal/clientes`);
  }

  const { id, nome, ativo } = await resposta.json();
  return { id, nome, ativo: ativo === true };
}

function exigir(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não definida. ` +
        'O Terraform a injeta a partir do SSM no apply (infra/main.tf).',
    );
  }
  return valor;
}
