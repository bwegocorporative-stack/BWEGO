import { API_URL } from '../config/api';
import { obterToken } from './authSession';

async function requisitarViagens(caminho, opcoes = {}) {
  const token = await obterToken();
  if (!token) {
    throw new Error('Inicia sessão novamente para aceder às viagens.');
  }

  const resposta = await fetch(`${API_URL}/viagens${caminho}`, {
    ...opcoes,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...opcoes.headers,
    },
  });

  let resultado;
  try {
    resultado = await resposta.json();
  } catch {
    throw new Error('O servidor devolveu uma resposta inválida.');
  }

  if (!resposta.ok) {
    const erro = new Error(
      resultado.mensagem || 'Não foi possível concluir o pedido da viagem.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  return resultado;
}

export async function listarViagens() {
  const resultado = await requisitarViagens('/?limite=50');
  return resultado.viagens || [];
}

export async function obterEnderecoCoordenadas(latitude, longitude) {
  const parametros = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  const resultado = await requisitarViagens(
    `/localizacao/reversa?${parametros.toString()}`
  );
  return resultado.localizacao;
}

export async function criarViagem(dados) {
  return requisitarViagens('/', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

export async function obterViagem(id) {
  return requisitarViagens(`/${encodeURIComponent(id)}`);
}

export async function cancelarViagem(id) {
  return requisitarViagens(`/${encodeURIComponent(id)}/cancelar`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function avaliarViagem(id, avaliacao, comentario) {
  return requisitarViagens(`/${encodeURIComponent(id)}/avaliar`, {
    method: 'POST',
    body: JSON.stringify({ avaliacao, comentario }),
  });
}
