import { API_URL } from '../config/api';
import { obterToken } from './authSession';

async function requisitarCarteira(caminho, opcoes = {}) {
  const token = await obterToken();
  if (!token) {
    throw new Error('Inicia sessão novamente para aceder à carteira.');
  }

  const resposta = await fetch(`${API_URL}/carteira${caminho}`, {
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
      resultado.mensagem || 'Não foi possível concluir o pedido da carteira.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  return resultado;
}

export async function carregarCarteira() {
  return requisitarCarteira('/');
}

export async function criarRecargaCarteira(valor, metodo) {
  return requisitarCarteira('/recargas', {
    method: 'POST',
    body: JSON.stringify({ valor, metodo }),
  });
}

export async function transferirCarteira(valor, destinatario) {
  return requisitarCarteira('/transferencias', {
    method: 'POST',
    body: JSON.stringify({ valor, destinatario }),
  });
}
