import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File as ExpoFile } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'bwego.authToken';
const USER_KEY = 'bwego.authUser';
const PICKER_SESSION_KEY = 'bwego.pickerSession';
const REMEMBER_SESSION_KEY = 'bwego.rememberSession';

let tokenCache = null;
let userCache = null;
let lembrarSessaoCache = false;

function guardarUsuarioWeb(usuario) {
  if (typeof window === 'undefined') {
    return;
  }
  const armazenamento = window.sessionStorage.getItem(TOKEN_KEY)
    ? window.sessionStorage
    : window.localStorage;
  armazenamento.setItem(USER_KEY, JSON.stringify(usuario));
}

export async function guardarSessao(token, usuario, lembrarSessao) {
  tokenCache = token;
  userCache = usuario;
  lembrarSessaoCache = lembrarSessao;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const armazenamento = lembrarSessao
        ? window.localStorage
        : window.sessionStorage;
      const outroArmazenamento = lembrarSessao
        ? window.sessionStorage
        : window.localStorage;
      outroArmazenamento.removeItem(TOKEN_KEY);
      outroArmazenamento.removeItem(USER_KEY);
      armazenamento.setItem(TOKEN_KEY, token);
      armazenamento.setItem(USER_KEY, JSON.stringify(usuario));
    }
    return;
  }

  if (lembrarSessao) {
    await SecureStore.deleteItemAsync(PICKER_SESSION_KEY);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(usuario));
    await SecureStore.setItemAsync(REMEMBER_SESSION_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(PICKER_SESSION_KEY);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.setItemAsync(REMEMBER_SESSION_KEY, 'false');
  }
}

export async function prepararSessaoParaGaleria() {
  if (Platform.OS === 'web') {
    return;
  }

  const sessaoLembrada =
    lembrarSessaoCache ||
    (await SecureStore.getItemAsync(REMEMBER_SESSION_KEY)) === 'true';
  if (sessaoLembrada) {
    return;
  }

  const token = await obterToken();
  if (!token) {
    return;
  }

  const usuario = await obterUsuario();
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (usuario) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(usuario));
  }
  await SecureStore.setItemAsync(PICKER_SESSION_KEY, 'true');
}

export async function limparSessaoTemporariaGaleria() {
  if (Platform.OS === 'web') {
    return;
  }

  const sessaoTemporaria = await SecureStore.getItemAsync(PICKER_SESSION_KEY);
  if (sessaoTemporaria !== 'true') {
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(PICKER_SESSION_KEY);
}

export async function obterToken() {
  if (tokenCache) {
    return tokenCache;
  }

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return null;
    }
    tokenCache =
      window.sessionStorage.getItem(TOKEN_KEY) ||
      window.localStorage.getItem(TOKEN_KEY);
    return tokenCache;
  }

  tokenCache = await SecureStore.getItemAsync(TOKEN_KEY);
  return tokenCache;
}

export async function obterUsuario() {
  if (userCache) {
    return userCache;
  }

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return null;
    }
    const usuarioGuardado =
      window.sessionStorage.getItem(USER_KEY) ||
      window.localStorage.getItem(USER_KEY);
    userCache = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    return userCache;
  }

  const usuarioGuardado = await SecureStore.getItemAsync(USER_KEY);
  userCache = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
  return userCache;
}

export async function carregarPerfilUsuario() {
  const token = await obterToken();
  if (!token) {
    return null;
  }

  const resposta = await fetch(`${API_URL}/usuarios/perfil`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const resultado = await resposta.json();

  if (resposta.status === 401) {
    await terminarSessao();
  }

  if (!resposta.ok) {
    const erro = new Error(
      resultado.mensagem || 'Não foi possível carregar o perfil.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  userCache = resultado.usuario;
  if (Platform.OS === 'web') {
    guardarUsuarioWeb(userCache);
  } else {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userCache));
  }

  return userCache;
}

export async function atualizarPerfilUsuario(dados) {
  const token = await obterToken();
  if (!token) {
    return null;
  }

  const resposta = await fetch(`${API_URL}/usuarios/perfil`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dados),
  });
  const resultado = await resposta.json();

  if (resposta.status === 401) {
    await terminarSessao();
  }

  if (!resposta.ok) {
    const erro = new Error(
      resultado.mensagem || 'Não foi possível atualizar o perfil.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  userCache = resultado.usuario;
  if (Platform.OS === 'web') {
    guardarUsuarioWeb(userCache);
  } else {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userCache));
  }

  return userCache;
}

export async function atualizarFotoPerfil(foto) {
  const token = await obterToken();
  if (!token) {
    throw new Error('A sessão não está disponível. Inicia sessão novamente antes de alterar a foto.');
  }

  if (!foto?.uri) {
    throw new Error('Não foi possível ler a imagem selecionada.');
  }

  const dados = new FormData();
  if (Platform.OS === 'web' && foto.file) {
    dados.append('foto', foto.file, foto.fileName || 'perfil.jpg');
  } else {
    dados.append('foto', new ExpoFile(foto.uri));
  }

  const resposta = await expoFetch(`${API_URL}/usuarios/perfil/foto`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: dados,
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    const erro = new Error(
      resultado.mensagem || 'Não foi possível atualizar a foto de perfil.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  userCache = resultado.usuario;
  if (Platform.OS === 'web') {
    guardarUsuarioWeb(userCache);
  } else {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userCache));
  }

  return userCache;
}

export async function alterarPalavraPasse(dados) {
  const token = await obterToken();
  if (!token) {
    return null;
  }

  const resposta = await fetch(`${API_URL}/usuarios/alterar-senha`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dados),
  });
  const resultado = await resposta.json();

  if (resposta.status === 401) {
    await terminarSessao();
  }

  if (!resposta.ok) {
    const erro = new Error(
      resultado.mensagem || 'Não foi possível alterar a palavra-passe.'
    );
    erro.status = resposta.status;
    throw erro;
  }

  return resultado;
}

export async function terminarSessao() {
  tokenCache = null;
  userCache = null;
  lembrarSessaoCache = false;

  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(PICKER_SESSION_KEY);
    await SecureStore.deleteItemAsync(REMEMBER_SESSION_KEY);
  } else if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }
}
