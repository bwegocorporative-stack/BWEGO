import { API_URL } from '../config/api';
import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { obterToken } from './authSession';

function criarDadosMultipart(dados, imagem) {
  const formData = new FormData();
  Object.entries(dados).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null) {
      formData.append(chave, String(valor));
    }
  });
  if (imagem?.uri) {
    if (Platform.OS === 'web' && imagem.file) {
      formData.append('imagem', imagem.file, imagem.fileName || 'estabelecimento.jpg');
    } else {
      formData.append('imagem', new ExpoFile(imagem.uri));
    }
  }
  return formData;
}

async function criarDadosMultipartComImagem(dados, imagem, nomePadrao) {
  const imagemWebSemFicheiro =
    Platform.OS === 'web' && imagem?.uri && !imagem.file;
  const formData = criarDadosMultipart(
    dados,
    imagemWebSemFicheiro ? null : imagem
  );
  if (imagemWebSemFicheiro) {
    const respostaImagem = await fetch(imagem.uri);
    if (!respostaImagem.ok) {
      throw new Error('Não foi possível ler a nova imagem.');
    }
    const ficheiro = await respostaImagem.blob();
    formData.append('imagem', ficheiro, imagem.fileName || nomePadrao);
  }
  return formData;
}

async function requisitarAdmin(caminho, opcoes = {}) {
  const token = await obterToken();
  if (!token) {
    throw new Error('Inicia sessão novamente para aceder à administração.');
  }

  const enviarComExpoFetch =
    Platform.OS !== 'web' &&
    typeof FormData !== 'undefined' &&
    opcoes.body instanceof FormData;
  const requisitar = enviarComExpoFetch ? expoFetch : fetch;
  const resposta = await requisitar(`${API_URL}/admin${caminho}`, {
    ...opcoes,
    headers: {
      Accept: 'application/json',
      Authorization: ['Bearer', token].join(' '),
      ...(opcoes.body && !(typeof FormData !== 'undefined' && opcoes.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
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
      resultado.mensagem || 'Não foi possível concluir a operação administrativa.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  return resultado;
}

function criarQuery(filtros = {}) {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      parametros.set(chave, String(valor));
    }
  });
  const query = parametros.toString();
  return query ? `?${query}` : '';
}

export async function obterDashboardAdmin() {
  const resultado = await requisitarAdmin('/dashboard');
  return resultado.dashboard;
}

export async function listarGestoresAdmin() {
  const resultado = await requisitarAdmin('/gestores');
  return resultado.gestores || [];
}

export async function criarGestorAdmin(dados, imagem) {
  return requisitarAdmin('/gestores', {
    method: 'POST',
    body: criarDadosMultipart(dados, imagem),
  });
}

export async function atualizarGestorAdmin(id, dados, imagem) {
  const body = await criarDadosMultipartComImagem(dados, imagem, 'gestor.jpg');
  return requisitarAdmin(`/gestores/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export async function removerGestorAdmin(id) {
  return requisitarAdmin(`/gestores/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function listarClientesAdmin(filtros) {
  const resultado = await requisitarAdmin(
    `/clientes${criarQuery(filtros)}`
  );
  return resultado.clientes || [];
}

export async function listarMotoristasAdmin(filtros) {
  const { pesquisa, ...restantesFiltros } = filtros;
  const resultado = await requisitarAdmin(
    `/motoristas${criarQuery({ ...restantesFiltros, busca: pesquisa })}`
  );
  return resultado.motoristas || [];
}

export async function listarParceirosAdmin(filtros) {
  const resultado = await requisitarAdmin(
    `/parceiros${criarQuery(filtros)}`
  );
  return resultado.parceiros || [];
}

export async function listarFarmaciasAdmin(filtros) {
  const resultado = await requisitarAdmin(
    `/farmacias${criarQuery(filtros)}`
  );
  return resultado.parceiros || [];
}

export async function criarParceiroAdmin(dados, imagem, farmacia = false) {
  const resultado = await requisitarAdmin(
    farmacia ? '/farmacias' : '/parceiros',
    {
      method: 'POST',
      body: criarDadosMultipart(dados, imagem),
    }
  );
  return resultado;
}

export async function atualizarImagemParceiroAdmin(id, imagem) {
  return requisitarAdmin(`/parceiros/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: criarDadosMultipart({}, imagem),
  });
}

export async function listarProdutosAdmin(filtros) {
  const resultado = await requisitarAdmin(
    `/produtos${criarQuery(filtros)}`
  );
  return resultado.produtos || [];
}

export async function listarCategoriasAdmin(filtros) {
  const resultado = await requisitarAdmin(
    `/categorias-produtos${criarQuery(filtros)}`
  );
  return resultado.categorias || [];
}

export async function criarCategoriaAdmin(dados) {
  return requisitarAdmin('/categorias-produtos', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

export async function atualizarCategoriaAdmin(dados) {
  return requisitarAdmin('/categorias-produtos', {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
}

export async function removerCategoriaAdmin(id, nome) {
  return requisitarAdmin(
    `/categorias-produtos${criarQuery({ id, nome })}`,
    { method: 'DELETE' }
  );
}

export async function atualizarAprovacaoMotorista(id, estado_aprovacao) {
  return requisitarAdmin(`/motoristas/${encodeURIComponent(id)}/aprovacao`, {
    method: 'PATCH',
    body: JSON.stringify({ estado_aprovacao }),
  });
}

export async function atualizarClienteAdmin(id, dados, imagem) {
  const body = imagem
    ? await criarDadosMultipartComImagem(dados, imagem, 'cliente.jpg')
    : JSON.stringify(dados);
  return requisitarAdmin(`/clientes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export async function atualizarMotoristaAdmin(id, dados, imagem) {
  const body = imagem
    ? await criarDadosMultipartComImagem(dados, imagem, 'motorista.jpg')
    : JSON.stringify(dados);
  return requisitarAdmin(`/motoristas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export async function atualizarParceiroAdmin(id, dados, imagem) {
  return requisitarAdmin(`/parceiros/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: imagem ? criarDadosMultipart(dados, imagem) : JSON.stringify(dados),
  });
}

export async function removerParceiroAdmin(id) {
  return requisitarAdmin(`/parceiros/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function removerProdutoAdmin(id) {
  return requisitarAdmin(`/produtos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function atualizarProdutoAdmin(id, dados, imagem) {
  const preco =
    typeof dados.preco === 'string'
      ? dados.preco.trim().replace(',', '.')
      : dados.preco;
  const precoPromocional =
    typeof dados.preco_promocional === 'string'
      ? dados.preco_promocional.trim().replace(',', '.')
      : dados.preco_promocional;
  const dadosAtualizados = {
    ...dados,
    ...(preco !== undefined ? { preco } : {}),
    ...(precoPromocional !== undefined
      ? { preco_promocional: precoPromocional || null }
      : {}),
  };
  return requisitarAdmin(`/produtos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: imagem
      ? criarDadosMultipart(dadosAtualizados, imagem)
      : JSON.stringify(dadosAtualizados),
  });
}

export async function criarProdutoAdmin(dados, imagem) {
  return requisitarAdmin('/produtos', {
    method: 'POST',
    body: criarDadosMultipart(dados, imagem),
  });
}

export async function atualizarEstadoParceiro(id, ativo) {
  return requisitarAdmin(`/parceiros/${encodeURIComponent(id)}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo }),
  });
}

export async function atualizarEstadoProduto(id, ativo) {
  return requisitarAdmin(`/produtos/${encodeURIComponent(id)}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo }),
  });
}
