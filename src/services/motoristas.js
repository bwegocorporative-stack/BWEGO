import { API_URL } from '../config/api';
import { obterToken } from './authSession';

async function requisitarMotoristas(caminho, opcoes = {}) {
  const token = await obterToken();
  if (!token) {
    throw new Error('Inicia sessão novamente para aceder aos motoristas.');
  }

  const resposta = await fetch(`${API_URL}/motoristas${caminho}`, {
    ...opcoes,
    headers: {
      Accept: 'application/json',
      Authorization: ['Bearer', token].join(' '),
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
      resultado.mensagem || 'Não foi possível concluir o pedido aos motoristas.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  return resultado;
}

export async function listarMotoristasPerto(latitude, longitude, raioKm = 5) {
  const parametros = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    raio_km: String(raioKm),
  });
  const resultado = await requisitarMotoristas(
    '/perto?' + parametros.toString()
  );
  return resultado.motoristas || [];
}

export async function atualizarLocalizacaoMotorista(latitude, longitude) {
  return requisitarMotoristas('/localizacao', {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function atualizarDisponibilidadeMotorista(disponibilidade) {
  return requisitarMotoristas('/disponibilidade', {
    method: 'PATCH',
    body: JSON.stringify({ disponibilidade }),
  });
}
