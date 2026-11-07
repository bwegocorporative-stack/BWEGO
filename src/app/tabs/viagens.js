
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Linking,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "../../components/TripMap";
import {
  avaliarViagem,
  cancelarViagem,
  criarViagem,
  listarViagens,
  obterViagem,
  obterEnderecoCoordenadas,
} from "../../services/viagens";
import { listarMotoristasPerto } from "../../services/motoristas";

// =====================================================
// CONFIGURAÇÕES
// =====================================================

// Intervalo de consulta do estado do pedido.
const INTERVALO_ATUALIZACAO = 5000;

const LOCALIZACAO_PADRAO = {
  latitude: -8.8383,
  longitude: 13.2344,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Tarifário de exemplo. Ajusta conforme o negócio.
const TARIFARIO = {
  taxaBase: 500,
  precoPorKm: 350,
  precoPorMinuto: 50,
  tarifaMinima: 1000,
  factorPercurso: 1.3,
  velocidadeMedia: 25,
};

// Categorias de transporte.
const CATEGORIAS = [
  {
    id: "economico",
    nome: "BWÉ Económico",
    descricao: "Viagem económica",
    icon: "car-outline",
    multiplicador: 1,
    precoExtra: 0,
  },
  {
    id: "conforto",
    nome: "BWÉ Conforto",
    descricao: "Mais conforto na viagem",
    icon: "car-sport-outline",
    multiplicador: 1.35,
    precoExtra: 300,
  },
  {
    id: "premium",
    nome: "BWÉ Premium",
    descricao: "Experiência premium",
    icon: "car",
    multiplicador: 1.7,
    precoExtra: 700,
  },
  {
    id: "moto",
    nome: "BWÉ Moto",
    descricao: "Deslocação rápida",
    icon: "bicycle-outline",
    multiplicador: 0.75,
    precoExtra: 0,
  },
];

const METODOS_PAGAMENTO = [
  { id: "dinheiro", nome: "Dinheiro", icon: "cash-outline" },
  { id: "carteira", nome: "Carteira Bwé-Go", icon: "wallet-outline" },
  { id: "multicaixa", nome: "Multicaixa Express", icon: "phone-portrait-outline" },
  { id: "transferencia", nome: "Transferência", icon: "business-outline" },
];

const ESTADOS_ATIVOS = [
  "procurando_motorista",
  "pendente",
  "aceite",
  "motorista_a_caminho",
  "motorista_chegou",
  "em_andamento",
];

function formatarDataViagem(valor) {
  if (!valor) return "Data indisponível";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data indisponível";
  return data.toLocaleString("pt-AO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatarEstadoViagem(estado) {
  const estados = {
    pendente: "Pendente",
    procurando_motorista: "À procura de motorista",
    aceite: "Aceite",
    motorista_a_caminho: "Motorista a caminho",
    motorista_chegou: "Motorista chegou",
    em_andamento: "Em andamento",
    concluida: "Concluída",
    cancelada: "Cancelada",
    rejeitada: "Rejeitada",
  };
  return estados[estado] || estado || "Desconhecido";
}

function mapearMotorista(viagem) {
  if (!viagem?.motorista_id && !viagem?.motorista_nome) return null;
  return {
    id: viagem.motorista_id,
    nome: viagem.motorista_nome,
    telefone: viagem.motorista_telefone,
    foto: viagem.motorista_foto_url,
    veiculo: [
      viagem.marca_veiculo,
      viagem.modelo_veiculo,
    ].filter(Boolean).join(" "),
    matricula: viagem.motorista_matricula,
    avaliacao: viagem.avaliacao_motorista,
  };
}

function mapearEstadoPedido(estado) {
  if (["concluida"].includes(estado)) return "concluido";
  if (["cancelada", "rejeitada"].includes(estado)) return "cancelado";
  if (["procurando_motorista", "pendente"].includes(estado)) return "procurando";
  return "encontrado";
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function calcularDistancia(origem, destino) {
  const raioTerra = 6371;
  const rad = (valor) => (valor * Math.PI) / 180;

  const dLat = rad(destino.latitude - origem.latitude);
  const dLon = rad(destino.longitude - origem.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(origem.latitude)) *
      Math.cos(rad(destino.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatarKz(valor) {
  return `${Math.ceil(valor).toLocaleString("pt-PT")} Kz`;
}

function limparComponenteEndereco(valor) {
  if (!valor || typeof valor !== "string") return "";
  const componente = valor.trim();
  const codigoPlus = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;
  return codigoPlus.test(componente) ? "" : componente;
}

function extrairLocalizacao(enderecoNativo, enderecoGeografico) {
  const localidade =
    limparComponenteEndereco(enderecoGeografico?.localidade) ||
    limparComponenteEndereco(
      enderecoNativo?.neighbourhood ||
        enderecoNativo?.district ||
        enderecoNativo?.residential ||
        enderecoNativo?.suburb ||
        enderecoNativo?.village ||
        enderecoNativo?.town
    );
  const provincia =
    limparComponenteEndereco(enderecoGeografico?.provincia) ||
    limparComponenteEndereco(
      enderecoNativo?.region || enderecoNativo?.province
    );
  const municipioCandidato =
    limparComponenteEndereco(enderecoGeografico?.municipio) ||
    limparComponenteEndereco(
      enderecoNativo?.municipality ||
        enderecoNativo?.subregion ||
        enderecoNativo?.cityDistrict ||
        enderecoNativo?.city
    );
  const municipio =
    municipioCandidato?.toLocaleLowerCase() === provincia?.toLocaleLowerCase()
      ? ""
      : municipioCandidato;
  const pais =
    limparComponenteEndereco(enderecoGeografico?.pais) ||
    limparComponenteEndereco(enderecoNativo?.country);
  const logradouro =
    limparComponenteEndereco(enderecoGeografico?.logradouro) ||
    limparComponenteEndereco(
      [enderecoNativo?.street, enderecoNativo?.streetNumber]
        .filter(Boolean)
        .join(", ")
    );
  const componentes = [
    logradouro,
    localidade,
    municipio,
    provincia,
    pais,
  ].filter(Boolean);
  const endereco = componentes.filter(
    (componente, indice) =>
      componentes.findIndex(
        (outro) => outro.toLocaleLowerCase() === componente.toLocaleLowerCase()
      ) === indice
  );

  if (!endereco.length) {
    const nome = limparComponenteEndereco(
      enderecoGeografico?.nome || enderecoNativo?.name
    );
    if (nome) endereco.push(nome);
  }

  return {
    localidade,
    municipio,
    provincia,
    pais,
    endereco: endereco.join(", "),
  };
}

function calcularTarifa(origem, destino, categoria) {
  const distanciaDireta = calcularDistancia(origem, destino);
  const distancia = distanciaDireta * TARIFARIO.factorPercurso;

  const duracao =
    (distancia / TARIFARIO.velocidadeMedia) * 60;

  const tarifaBase =
    TARIFARIO.taxaBase +
    distancia * TARIFARIO.precoPorKm +
    duracao * TARIFARIO.precoPorMinuto;

  const categoriaSelecionada =
    CATEGORIAS.find((item) => item.id === categoria) || CATEGORIAS[0];

  const total =
    (tarifaBase * categoriaSelecionada.multiplicador) +
    categoriaSelecionada.precoExtra;

  // Arredondamento para o múltiplo de 100 seguinte.
  const totalArredondado = Math.ceil(
    Math.max(total, TARIFARIO.tarifaMinima) / 100
  ) * 100;

  return {
    distancia,
    duracao,
    total: totalArredondado,
  };
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function ViagensScreen() {
  const mapRef = useRef(null);
  const requisicaoOrigemRef = useRef(0);
  const requisicaoDestinoRef = useRef(0);

  const [filtro, setFiltro] = useState("Todas");
  const [viagens, setViagens] = useState([]);
  const [carregandoViagens, setCarregandoViagens] = useState(true);
  const [erroViagens, setErroViagens] = useState("");

  // LOCALIZAÇÃO
  const [localizacaoActual, setLocalizacaoActual] = useState(null);

  const [dadosLocalizacao, setDadosLocalizacao] = useState({
    localidade: "",
    provincia: "",
    municipio: "",
    pais: "",
  });
  const [enderecoOrigem, setEnderecoOrigem] = useState("");
  const [buscandoOrigem, setBuscandoOrigem] = useState(false);
  const [dadosDestino, setDadosDestino] = useState(null);

  const [carregandoLocalizacao, setCarregandoLocalizacao] =
    useState(true);
  const [motoristasProximos, setMotoristasProximos] = useState([]);
  const [carregandoMotoristas, setCarregandoMotoristas] = useState(false);
  const [erroMotoristas, setErroMotoristas] = useState("");

  // DESTINO
  const [destino, setDestino] = useState(null);
  const [enderecoDestino, setEnderecoDestino] = useState("");
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);

  // MAPA
  const [regiao, setRegiao] = useState(LOCALIZACAO_PADRAO);

  // TARIFA
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("economico");
  const [metodoPagamento, setMetodoPagamento] = useState("dinheiro");

  const [precoEstimado, setPrecoEstimado] = useState(null);
  const [distanciaEstimada, setDistanciaEstimada] = useState(0);
  const [duracaoEstimada, setDuracaoEstimada] = useState(0);

  const [destinoConfirmado, setDestinoConfirmado] = useState(false);

  // SOLICITAÇÃO DO MOTORISTA
  const [estadoPedido, setEstadoPedido] = useState("inicial");
  const [pedidoId, setPedidoId] = useState(null);
  const [motorista, setMotorista] = useState(null);
  const [carregandoPedido, setCarregandoPedido] = useState(false);
  const [erroPedido, setErroPedido] = useState("");
  const [detalhesViagem, setDetalhesViagem] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const resolverEndereco = React.useCallback(async (coordenadas) => {
    const [resultadoNativo, resultadoGeografico] = await Promise.allSettled([
      Location.reverseGeocodeAsync(coordenadas),
      obterEnderecoCoordenadas(
        coordenadas.latitude,
        coordenadas.longitude
      ),
    ]);
    const enderecoNativo =
      resultadoNativo.status === "fulfilled"
        ? resultadoNativo.value?.[0]
        : null;
    const enderecoGeografico =
      resultadoGeografico.status === "fulfilled"
        ? resultadoGeografico.value
        : null;

    if (resultadoGeografico.status === "rejected") {
      console.warn(
        "Não foi possível obter o endereço detalhado:",
        resultadoGeografico.reason
      );
    }

    return extrairLocalizacao(enderecoNativo, enderecoGeografico);
  }, []);

  const viagensFiltradas = viagens.filter((viagem) => {
    if (filtro === "Todas") return true;
    if (filtro === "Concluídas") return viagem.estado === "concluida";
    if (filtro === "Canceladas") {
      return ["cancelada", "rejeitada"].includes(viagem.estado);
    }
    return ESTADOS_ATIVOS.includes(viagem.estado);
  });

  const totalConcluidas = viagens.filter(
    (viagem) => viagem.estado === "concluida"
  ).length;
  const totalCanceladas = viagens.filter(
    (viagem) => ["cancelada", "rejeitada"].includes(viagem.estado)
  ).length;

  useFocusEffect(
    React.useCallback(() => {
      let ativo = true;

      const carregarHistorico = async () => {
        setCarregandoViagens(true);
        setErroViagens("");
        try {
          const lista = await listarViagens();
          if (!ativo) return;

          setViagens(lista);
          if (!pedidoId) {
            const viagemAtiva = lista.find((viagem) =>
              ESTADOS_ATIVOS.includes(viagem.estado)
            );
            if (viagemAtiva) {
              setPedidoId(String(viagemAtiva.id));
              setEstadoPedido(mapearEstadoPedido(viagemAtiva.estado));
              setMotorista(mapearMotorista(viagemAtiva));
            }
          }
        } catch (error) {
          if (ativo) {
            setErroViagens(
              error.message || "Não foi possível carregar o histórico."
            );
          }
        } finally {
          if (ativo) setCarregandoViagens(false);
        }
      };

      carregarHistorico();
      return () => {
        ativo = false;
      };
    }, [pedidoId])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!localizacaoActual) {
        setMotoristasProximos([]);
        setCarregandoMotoristas(false);
        setErroMotoristas("");
        return undefined;
      }

      let ativo = true;
      let pedidoEmCurso = false;
      const carregarMotoristas = async () => {
        if (pedidoEmCurso) return;
        pedidoEmCurso = true;
        try {
          setCarregandoMotoristas(true);
          const proximos = await listarMotoristasPerto(
            localizacaoActual.latitude,
            localizacaoActual.longitude
          );
          if (ativo) {
            setMotoristasProximos(proximos);
            setErroMotoristas("");
          }
        } catch (error) {
          if (ativo) {
            setErroMotoristas(
              error.message || "Não foi possível carregar os motoristas próximos."
            );
          }
        } finally {
          if (ativo) setCarregandoMotoristas(false);
          pedidoEmCurso = false;
        }
      };

      void carregarMotoristas();
      const intervalo = setInterval(() => {
        void carregarMotoristas();
      }, 15000);

      return () => {
        ativo = false;
        clearInterval(intervalo);
      };
    }, [localizacaoActual])
  );

  // =====================================================
  // LOCALIZAÇÃO ACTUAL
  // =====================================================

  const obterLocalizacao = React.useCallback(async () => {
    try {
      setCarregandoLocalizacao(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Autoriza o acesso à localização para identificarmos o teu ponto de partida."
        );
        return;
      }

      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordenadas = {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
      };

      setLocalizacaoActual(coordenadas);

      const novaRegiao = {
        ...coordenadas,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };

      setRegiao(novaRegiao);

      mapRef.current?.animateToRegion(novaRegiao, 800);

      const idRequisicao = ++requisicaoOrigemRef.current;
      const localizacao = await resolverEndereco(coordenadas);
      if (idRequisicao === requisicaoOrigemRef.current) {
        setEnderecoOrigem(
          localizacao.endereco || "Endereço não identificado"
        );
        setDadosLocalizacao(localizacao);
      }
    } catch (error) {
      console.log("Erro de localização:", error);

      Alert.alert(
        "Localização",
        "Não foi possível obter a tua localização actual."
      );
    } finally {
      setCarregandoLocalizacao(false);
    }
  }, [resolverEndereco]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void obterLocalizacao();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [obterLocalizacao]);

  // =====================================================
  // PESQUISA DE ENDEREÇOS
  // =====================================================

  const procurarOrigem = async () => {
    const consulta = enderecoOrigem.trim();
    if (!consulta) {
      Alert.alert("Origem em falta", "Escreve o teu ponto de partida.");
      return;
    }

    try {
      setBuscandoOrigem(true);
      const resultados = await Location.geocodeAsync(consulta);

      if (!resultados.length) {
        Alert.alert(
          "Local não encontrado",
          "Não foi possível encontrar esse ponto de partida. Tenta escrever outro endereço."
        );
        return;
      }

      const coordenadas = {
        latitude: resultados[0].latitude,
        longitude: resultados[0].longitude,
      };
      setLocalizacaoActual(coordenadas);

      const novaRegiao = {
        ...coordenadas,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
      setRegiao(novaRegiao);
      mapRef.current?.animateToRegion(novaRegiao, 800);

      const idRequisicao = ++requisicaoOrigemRef.current;
      const localizacao = await resolverEndereco(coordenadas);
      if (idRequisicao === requisicaoOrigemRef.current) {
        setDadosLocalizacao(localizacao);
        setEnderecoOrigem(
          localizacao.endereco || "Endereço não identificado"
        );
      }
      setDestinoConfirmado(false);
      setPrecoEstimado(null);
    } catch (error) {
      console.log("Erro ao identificar origem:", error);
      Alert.alert(
        "Origem",
        "Não foi possível encontrar esse ponto de partida."
      );
    } finally {
      setBuscandoOrigem(false);
    }
  };

  const obterEndereco = async (latitude, longitude) => {
    const idRequisicao = ++requisicaoDestinoRef.current;
    try {
      setBuscandoEndereco(true);
      const localizacao = await resolverEndereco({
        latitude,
        longitude,
      });
      if (idRequisicao === requisicaoDestinoRef.current) {
        setDadosDestino(localizacao);
        setEnderecoDestino(
          localizacao.endereco || "Endereço não identificado"
        );
      }
    } catch (error) {
      console.log("Erro ao identificar destino:", error);
      if (idRequisicao === requisicaoDestinoRef.current) {
        setDadosDestino(null);
        setEnderecoDestino("Endereço não identificado");
      }
    } finally {
      if (idRequisicao === requisicaoDestinoRef.current) {
        setBuscandoEndereco(false);
      }
    }
  };

  // =====================================================
  // SELECCIONAR DESTINO
  // =====================================================

  const selecionarDestino = async (coordenadas, atualizarEndereco = true) => {
    const novoDestino = {
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude,
    };

    setDestino(novoDestino);
    setDestinoConfirmado(false);
    setPrecoEstimado(null);

    setEstadoPedido("inicial");
    setPedidoId(null);
    setMotorista(null);

    if (atualizarEndereco) {
      setEnderecoDestino("A identificar endereço...");
      await obterEndereco(
        novoDestino.latitude,
        novoDestino.longitude
      );
    }
  };

  const procurarDestino = async () => {
    const consulta = enderecoDestino.trim();
    if (!consulta) {
      Alert.alert("Destino em falta", "Escreve para onde queres ir.");
      return;
    }

    try {
      setBuscandoEndereco(true);
      const resultados = await Location.geocodeAsync(consulta);

      if (!resultados.length) {
        Alert.alert(
          "Local não encontrado",
          "Não foi possível encontrar esse destino. Tenta escrever outro endereço."
        );
        return;
      }

      const coordenadas = {
        latitude: resultados[0].latitude,
        longitude: resultados[0].longitude,
      };
      await selecionarDestino(coordenadas);

      const novaRegiao = {
        ...coordenadas,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
      setRegiao(novaRegiao);
      mapRef.current?.animateToRegion(novaRegiao, 800);
    } catch (error) {
      console.log("Erro ao identificar destino:", error);
      Alert.alert(
        "Destino",
        "Não foi possível encontrar esse destino."
      );
    } finally {
      setBuscandoEndereco(false);
    }
  };

  const moverMarcador = async (evento) => {
    await selecionarDestino(evento.nativeEvent.coordinate);
  };

  // =====================================================
  // CALCULAR E CONFIRMAR PREÇO
  // =====================================================

  const confirmarDestino = () => {
    if (!localizacaoActual) {
      Alert.alert(
        "Localização indisponível",
        "Precisamos da tua localização para calcular a viagem."
      );
      return;
    }

    if (!destino) {
      Alert.alert(
        "Destino não seleccionado",
        "Toca no mapa para escolher o teu destino."
      );
      return;
    }

    if (buscandoEndereco || buscandoOrigem) {
      Alert.alert(
        "Aguarda",
        "Estamos a identificar o endereço da viagem."
      );
      return;
    }

    const calculo = calcularTarifa(
      localizacaoActual,
      destino,
      categoriaSelecionada
    );

    setDistanciaEstimada(calculo.distancia);
    setDuracaoEstimada(calculo.duracao);
    setPrecoEstimado(calculo.total);
    setDestinoConfirmado(true);
  };

  // =====================================================
  // SOLICITAR MOTORISTA
  // =====================================================

  const solicitarMotorista = async () => {
    if (!destinoConfirmado || !precoEstimado) {
      Alert.alert(
        "Confirma primeiro o destino",
        "Calcula o preço da viagem antes de solicitar o motorista."
      );
      return;
    }

    if (!localizacaoActual || !destino) {
      Alert.alert(
        "Localização inválida",
        "Não foi possível identificar a origem ou o destino."
      );
      return;
    }

    try {
      setCarregandoPedido(true);
      setErroPedido("");
      setEstadoPedido("procurando");
      setMotorista(null);

      const resultado = await criarViagem({
        origem_nome:
          dadosLocalizacao.municipio ||
          enderecoOrigem ||
          "Ponto de partida",
        origem_endereco: enderecoOrigem || null,
        origem_latitude: localizacaoActual.latitude,
        origem_longitude: localizacaoActual.longitude,
        destino_nome: enderecoDestino || "Destino selecionado",
        destino_endereco: enderecoDestino || null,
        destino_latitude: destino.latitude,
        destino_longitude: destino.longitude,
        distancia_km: Number(distanciaEstimada.toFixed(2)),
        duracao_estimada_minutos: Math.ceil(duracaoEstimada),
        tipo_viagem: "imediata",
        numero_passageiros: 1,
        categoria: categoriaSelecionada,
        preco_estimado: precoEstimado,
        metodo_pagamento: metodoPagamento,
      });

      const pedido = resultado.viagem;
      const id = pedido?.id;

      if (!id) {
        throw new Error(
          "O servidor não devolveu o identificador do pedido."
        );
      }

      setPedidoId(String(id));
      atualizarEstadoPedido(pedido);
      try {
        setViagens(await listarViagens());
      } catch (error) {
        setErroViagens(
          error.message || "Não foi possível atualizar o histórico."
        );
      }
      Alert.alert(
        "Viagem solicitada",
        resultado.mensagem || "A tua solicitação foi registada."
      );
    } catch (error) {
      console.log("Erro ao solicitar motorista:", error);

      setEstadoPedido("erro");
      setErroPedido(error.message);

      Alert.alert(
        "Não foi possível solicitar",
        error.message ||
          "Verifica a tua ligação e tenta novamente."
      );
    } finally {
      setCarregandoPedido(false);
    }
  };

  // =====================================================
  // INTERPRETAR RESPOSTA DO BACKEND
  // =====================================================

  const atualizarEstadoPedido = React.useCallback((pedido) => {
    const estado = String(
      pedido.estado || pedido.status || ""
    ).toLowerCase();

    if (
      estado === "motorista_encontrado" ||
      estado === "aceite" ||
      estado === "aceito" ||
      estado === "accepted" ||
      estado === "driver_assigned" ||
      estado === "motorista_a_caminho" ||
      estado === "motorista_chegou" ||
      estado === "em_andamento"
    ) {
      setEstadoPedido("encontrado");
      setMotorista(pedido.motorista || mapearMotorista(pedido));

      return;
    }

    if (
      estado === "procurando" ||
      estado === "pendente" ||
      estado === "procurando_motorista" ||
      estado === "searching"
    ) {
      setEstadoPedido("procurando");
      return;
    }

    if (
      estado === "cancelado" ||
      estado === "cancelada" ||
      estado === "cancelled" ||
      estado === "rejeitada"
    ) {
      setEstadoPedido("cancelado");
      return;
    }

    if (
      estado === "concluida" ||
      estado === "concluída" ||
      estado === "completed"
    ) {
      setEstadoPedido("concluido");
    }
  }, []);

  // =====================================================
  // ACOMPANHAR ESTADO DO PEDIDO
  // =====================================================

  useEffect(() => {
    if (!pedidoId || !["procurando", "encontrado"].includes(estadoPedido)) {
      return;
    }

    let activo = true;

    const consultarPedido = async () => {
      try {
        const resultado = await obterViagem(pedidoId);
        if (!activo || !resultado.viagem) return;
        const pedido = resultado.viagem;

        setViagens((atuais) =>
          atuais.map((item) =>
            String(item.id) === String(pedido.id) ? pedido : item
          )
        );
        atualizarEstadoPedido(pedido);
      } catch (error) {
        if (activo) {
          setErroPedido(error.message || "Não foi possível atualizar a viagem.");
        }
      }
    };

    const intervalo = setInterval(
      consultarPedido,
      INTERVALO_ATUALIZACAO
    );

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [pedidoId, estadoPedido, atualizarEstadoPedido]);

  // =====================================================
  // CANCELAR SOLICITAÇÃO
  // =====================================================

  const cancelarPedido = () => {
    if (!pedidoId) return;

    Alert.alert(
      "Cancelar solicitação",
      "Tens a certeza de que pretendes cancelar este pedido?",
      [
        {
          text: "Não",
          style: "cancel",
        },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: executarCancelamento,
        },
      ]
    );
  };

  const executarCancelamento = async () => {
    try {
      setCarregandoPedido(true);

      await cancelarViagem(pedidoId);

      setEstadoPedido("cancelado");
      setMotorista(null);
      setViagens(await listarViagens());

      Alert.alert(
        "Pedido cancelado",
        "A tua solicitação foi cancelada."
      );
    } catch (error) {
      Alert.alert("Erro", error.message || "Não foi possível cancelar a viagem.");
    } finally {
      setCarregandoPedido(false);
    }
  };

  const abrirDetalhesViagem = async (viagem) => {
    setCarregandoDetalhes(true);
    setDetalhesViagem(viagem);
    setAvaliacaoSelecionada(
      Number(viagem.avaliacao_passageiro) || 5
    );
    setComentarioAvaliacao(viagem.comentario_passageiro || "");

    try {
      const resultado = await obterViagem(viagem.id);
      setDetalhesViagem(resultado.viagem || viagem);
    } catch (error) {
      Alert.alert(
        "Detalhes indisponíveis",
        error.message || "Não foi possível carregar esta viagem."
      );
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const submeterAvaliacao = async () => {
    if (!detalhesViagem?.id) return;

    try {
      setEnviandoAvaliacao(true);
      await avaliarViagem(
        detalhesViagem.id,
        avaliacaoSelecionada,
        comentarioAvaliacao.trim()
      );
      const viagemAtualizada = {
        ...detalhesViagem,
        avaliacao_passageiro: avaliacaoSelecionada,
        comentario_passageiro: comentarioAvaliacao.trim() || null,
      };
      setDetalhesViagem(viagemAtualizada);
      setViagens((atuais) =>
        atuais.map((item) =>
          String(item.id) === String(viagemAtualizada.id)
            ? viagemAtualizada
            : item
        )
      );
      Alert.alert("Avaliação registada", "Obrigado por avaliares a viagem.");
    } catch (error) {
      Alert.alert(
        "Não foi possível avaliar",
        error.message || "Tenta novamente."
      );
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  // =====================================================
  // CONTACTAR MOTORISTA
  // =====================================================

  const contactarMotorista = async () => {
    if (!motorista?.telefone) {
      Alert.alert(
        "Contacto indisponível",
        "O número de telefone do motorista não está disponível."
      );
      return;
    }

    const telefone = String(motorista.telefone).replace(
      /[^0-9+]/g,
      ""
    );

    try {
      await Linking.openURL(`tel:${telefone}`);
    } catch {
      Alert.alert(
        "Erro",
        "Não foi possível abrir a aplicação de chamadas."
      );
    }
  };

  // =====================================================
  // RENDERIZAR DADOS DO MOTORISTA
  // =====================================================

  const renderMotorista = () => {
    if (!motorista) return null;

    const nome =
      motorista.nome ||
      motorista.name ||
      "Motorista";

    const veiculo =
      motorista.veiculo ||
      motorista.modeloVeiculo ||
      "Veículo não informado";

    const matricula =
      motorista.matricula ||
      motorista.placa ||
      "Matrícula não informada";

    const avaliacao =
      motorista.avaliacao ??
      motorista.rating ??
      "—";

    const foto =
      motorista.foto ||
      motorista.fotografia ||
      motorista.avatar;

    return (
      <View style={styles.driverCard}>
        <Text style={styles.driverSectionTitle}>
          O teu motorista
        </Text>

        <View style={styles.driverHeader}>
          {foto ? (
            <Image
              source={{ uri: foto }}
              style={styles.driverPhoto}
            />
          ) : (
            <View style={styles.driverPhotoPlaceholder}>
              <Ionicons
                name="person"
                size={31}
                color="#173B70"
              />
            </View>
          )}

          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{nome}</Text>

            <View style={styles.ratingRow}>
              <Ionicons
                name="star"
                size={15}
                color="#F5B51B"
              />

              <Text style={styles.driverRating}>
                {avaliacao}
              </Text>
            </View>

            <Text style={styles.driverVehicle}>
              {veiculo}
            </Text>
          </View>

          <View style={styles.driverConfirmed}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#16A36A"
            />
            <Text style={styles.driverConfirmedText}>
              Aceite
            </Text>
          </View>
        </View>

        <View style={styles.plateBox}>
          <Text style={styles.plateLabel}>Matrícula</Text>
          <Text style={styles.plateValue}>{matricula}</Text>
        </View>

        {motorista.telefone ? (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={contactarMotorista}
          >
            <Ionicons
              name="call-outline"
              size={19}
              color="#FFFFFF"
            />
            <Text style={styles.contactButtonText}>
              Contactar motorista
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.fixedMapSection}>
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={LOCALIZACAO_PADRAO}
            region={regiao}
            onPress={(evento) =>
              selecionarDestino(evento.nativeEvent.coordinate)
            }
            showsUserLocation={!!localizacaoActual}
            showsMyLocationButton={false}
            showsCompass
            loadingEnabled
            toolbarEnabled={false}
          >
            {destino && (
              <Marker
                coordinate={destino}
                draggable
                onDragEnd={moverMarcador}
                title="Destino escolhido"
                description="Arrasta para ajustar o destino."
                pinColor="#16A36A"
              />
            )}

            {motoristasProximos.map((motoristaProximo) => {
              const foto = motoristaProximo.foto_url;
              return (
                <Marker
                  key={`motorista-${motoristaProximo.id}`}
                  coordinate={{
                    latitude: Number(motoristaProximo.latitude),
                    longitude: Number(motoristaProximo.longitude),
                  }}
                  title={motoristaProximo.nome || "Motorista disponível"}
                  description={
                    motoristaProximo.avaliacao_media
                      ? `Avaliação ${Number(
                          motoristaProximo.avaliacao_media
                        ).toFixed(1)}`
                      : "Motorista disponível perto de ti"
                  }
                  accessibilityLabel={`Motorista disponível ${motoristaProximo.nome || ""}`}
                >
                  <View style={styles.nearbyDriverMarker}>
                    <View style={styles.nearbyDriverPhotoFrame}>
                      {foto ? (
                        <Image
                          source={{ uri: foto }}
                          style={styles.nearbyDriverPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="person"
                          size={20}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                    <View style={styles.nearbyDriverMarkerTip} />
                  </View>
                </Marker>
              );
            })}

            {localizacaoActual && destino && (
              <Polyline
                coordinates={[localizacaoActual, destino]}
                strokeColor="#16A36A"
                strokeWidth={4}
                lineDashPattern={[8, 5]}
              />
            )}
          </MapView>

          {carregandoLocalizacao && (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#173B70" />
              <Text style={styles.mapLoadingText}>
                A preparar o mapa...
              </Text>
            </View>
          )}

          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Para onde vamos?</Text>
              <Text style={styles.mapSubtitle}>
                {carregandoMotoristas
                  ? "A procurar motoristas disponíveis..."
                  : erroMotoristas
                    ? "Não foi possível atualizar os motoristas."
                    : `${motoristasProximos.length} motoristas disponíveis num raio de 5 km.`}
              </Text>
            </View>

            <View style={styles.mapIcon}>
              <Ionicons
                name="map-outline"
                size={23}
                color="#173B70"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={obterLocalizacao}
          >
            <Ionicons
              name="locate"
              size={22}
              color="#173B70"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CABEÇALHO */}

        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>BWÉ-GO</Text>
            <Text style={styles.title}>As minhas viagens</Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={obterLocalizacao}
          >
            <Ionicons
              name="navigate-outline"
              size={24}
              color="#101820"
            />
          </TouchableOpacity>
        </View>

        {/* RESUMO */}

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Ionicons
              name="car-sport-outline"
              size={27}
              color="#16A36A"
            />
            <Text style={styles.summaryNumber}>{viagens.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.summaryItem}>
            <Ionicons
              name="checkmark-circle-outline"
              size={27}
              color="#16A36A"
            />
            <Text style={styles.summaryNumber}>{totalConcluidas}</Text>
            <Text style={styles.summaryLabel}>Concluídas</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.summaryItem}>
            <Ionicons
              name="close-circle-outline"
              size={27}
              color="#E65B5B"
            />
            <Text style={styles.summaryNumber}>{totalCanceladas}</Text>
            <Text style={styles.summaryLabel}>Canceladas</Text>
          </View>
        </View>

        {/* LOCALIZAÇÃO ACTUAL */}

        <View style={styles.currentLocation}>
          <View style={styles.currentLocationHeader}>
            <View style={styles.currentLocationIcon}>
              <Ionicons
                name="navigate"
                size={21}
                color="#16A36A"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.currentLocationTitle}>
                A tua localização actual
              </Text>

              <Text style={styles.currentLocationSubtitle}>
                Posição de partida da viagem
              </Text>
            </View>

            <TouchableOpacity
              onPress={obterLocalizacao}
              disabled={carregandoLocalizacao}
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color="#173B70"
              />
            </TouchableOpacity>
          </View>

          {carregandoLocalizacao ? (
            <View style={styles.loadingLocation}>
              <ActivityIndicator
                size="small"
                color="#16A36A"
              />
              <Text style={styles.loadingText}>
                A identificar localização...
              </Text>
            </View>
          ) : (
            <View style={styles.locationDetails}>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Localidade</Text>
                <Text style={styles.locationValue}>
                  {dadosLocalizacao?.localidade || "Não identificada"}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Município</Text>
                <Text style={styles.locationValue}>
                  {dadosLocalizacao?.municipio || "Não identificado"}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Província</Text>
                <Text style={styles.locationValue}>
                  {dadosLocalizacao?.provincia || "Não identificada"}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>País</Text>
                <Text style={styles.locationValue}>
                  {dadosLocalizacao?.pais || "Não identificado"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* DETALHES DA VIAGEM */}

        <View style={styles.bookingSection}>
          <View style={styles.mapInstruction}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color="#173B70"
            />

            <Text style={styles.instructionText}>
              Escreve os endereços e toca na pesquisa, ou escolhe
              o destino directamente no mapa.
            </Text>
          </View>

          <View style={styles.addressFieldsCard}>
            <View style={styles.addressField}>
              <View
                style={[
                  styles.addressFieldIcon,
                  styles.originFieldIcon,
                ]}
              >
                <Ionicons name="navigate" size={18} color="#16A36A" />
              </View>

              <View style={styles.addressFieldContent}>
                <Text style={styles.addressFieldLabel}>ONDE ESTAMOS?</Text>
                <TextInput
                  accessibilityLabel="Endereço de partida"
                  style={styles.addressFieldInput}
                  value={enderecoOrigem}
                  onChangeText={(texto) => {
                    requisicaoOrigemRef.current += 1;
                    setEnderecoOrigem(texto);
                    setLocalizacaoActual(null);
                    setDadosLocalizacao(null);
                    setDestinoConfirmado(false);
                    setPrecoEstimado(null);
                    setEstadoPedido("inicial");
                    setPedidoId(null);
                    setMotorista(null);
                  }}
                  placeholder="Escreve o ponto de partida"
                  placeholderTextColor="#A0A0A0"
                  returnKeyType="search"
                  onSubmitEditing={procurarOrigem}
                  editable={!buscandoOrigem}
                />
              </View>

              <TouchableOpacity
                accessibilityLabel="Pesquisar ponto de partida"
                style={styles.addressFieldButton}
                onPress={procurarOrigem}
                disabled={buscandoOrigem}
              >
                {buscandoOrigem ? (
                  <ActivityIndicator size="small" color="#16A36A" />
                ) : (
                  <Ionicons name="search" size={20} color="#16A36A" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.addressFieldDivider} />

            <View style={styles.addressField}>
              <View style={styles.addressFieldIcon}>
                <Ionicons name="location" size={19} color="#173B70" />
              </View>

              <View style={styles.addressFieldContent}>
                <Text style={styles.addressFieldLabel}>ONDE VAMOS?</Text>
                <TextInput
                  accessibilityLabel="Endereço de destino"
                  style={styles.addressFieldInput}
                  value={enderecoDestino}
                  onChangeText={(texto) => {
                    requisicaoDestinoRef.current += 1;
                    setEnderecoDestino(texto);
                    setDestino(null);
                    setDadosDestino(null);
                    setDestinoConfirmado(false);
                    setPrecoEstimado(null);
                    setEstadoPedido("inicial");
                    setPedidoId(null);
                    setMotorista(null);
                  }}
                  placeholder="Escreve o teu destino"
                  placeholderTextColor="#A0A0A0"
                  returnKeyType="search"
                  onSubmitEditing={procurarDestino}
                  editable={!buscandoEndereco}
                />
              </View>

              <TouchableOpacity
                accessibilityLabel="Pesquisar destino"
                style={styles.addressFieldButton}
                onPress={procurarDestino}
                disabled={buscandoEndereco}
              >
                {buscandoEndereco ? (
                  <ActivityIndicator size="small" color="#16A36A" />
                ) : (
                  <Ionicons name="search" size={20} color="#16A36A" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {destino && dadosDestino && (
            <View style={styles.locationDetails}>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Localidade</Text>
                <Text style={styles.locationValue}>
                  {dadosDestino.localidade || "Não identificada"}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Município</Text>
                <Text style={styles.locationValue}>
                  {dadosDestino.municipio || "Não identificado"}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Província</Text>
                <Text style={styles.locationValue}>
                  {dadosDestino.provincia || "Não identificada"}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>País</Text>
                <Text style={styles.locationValue}>
                  {dadosDestino.pais || "Não identificado"}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.mapAttribution}>
            Endereços: © OpenStreetMap contributors
          </Text>

          {/* CATEGORIAS DE VEÍCULOS */}

          <Text style={styles.vehicleSectionTitle}>
            Escolhe o teu veículo
          </Text>

          {CATEGORIAS.map((categoria) => {
            const activo =
              categoriaSelecionada === categoria.id;

            return (
              <TouchableOpacity
                key={categoria.id}
                style={[
                  styles.vehicleCard,
                  activo && styles.vehicleCardActive,
                ]}
                onPress={() => {
                  setCategoriaSelecionada(categoria.id);
                  setDestinoConfirmado(false);
                  setPrecoEstimado(null);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.vehicleIcon,
                    activo && styles.vehicleIconActive,
                  ]}
                >
                  <Ionicons
                    name={categoria.icon}
                    size={27}
                    color={activo ? "#FFFFFF" : "#173B70"}
                  />
                </View>

                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {categoria.nome}
                  </Text>
                  <Text style={styles.vehicleDescription}>
                    {categoria.descricao}
                  </Text>
                </View>

                <View style={styles.vehicleSelection}>
                  {activo ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={23}
                      color="#16A36A"
                    />
                  ) : (
                    <View style={styles.radioCircle} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.vehicleSectionTitle}>
            Método de pagamento
          </Text>
          <View style={styles.paymentMethods}>
            {METODOS_PAGAMENTO.map((metodo) => {
              const ativo = metodoPagamento === metodo.id;
              return (
                <TouchableOpacity
                  key={metodo.id}
                  style={[
                    styles.paymentMethod,
                    ativo && styles.paymentMethodActive,
                  ]}
                  onPress={() => setMetodoPagamento(metodo.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                >
                  <Ionicons
                    name={metodo.icon}
                    size={18}
                    color={ativo ? "#FFFFFF" : "#173B70"}
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      ativo && styles.paymentMethodTextActive,
                    ]}
                  >
                    {metodo.nome}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CONFIRMAR DESTINO */}

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!destino ||
                buscandoEndereco ||
                buscandoOrigem ||
                !localizacaoActual ||
                estadoPedido === "procurando" ||
                estadoPedido === "encontrado") &&
                styles.disabledButton,
            ]}
            onPress={confirmarDestino}
            disabled={
              !destino ||
              buscandoEndereco ||
              buscandoOrigem ||
              !localizacaoActual ||
              estadoPedido === "procurando" ||
              estadoPedido === "encontrado"
            }
          >
            <Text style={styles.confirmButtonText}>
              Confirmar destino e calcular preço
            </Text>
            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* ESTIMATIVA */}

          {destinoConfirmado && precoEstimado !== null && (
            <View style={styles.priceCard}>
              <View style={styles.priceHeader}>
                <View>
                  <Text style={styles.priceTitle}>
                    Estimativa da tua viagem
                  </Text>
                  <Text style={styles.priceSubtitle}>
                    BWÉ GO · {categoriaSelecionada.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.priceIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={23}
                    color="#16A36A"
                  />
                </View>
              </View>

              <View style={styles.priceMain}>
                <Text style={styles.priceLabel}>
                  Total estimado a pagar
                </Text>

                <Text style={styles.priceValue}>
                  {formatarKz(precoEstimado)}
                </Text>
              </View>

              <View style={styles.priceDivider} />

              <View style={styles.priceDetailRow}>
                <View style={styles.priceDetail}>
                  <Ionicons
                    name="map-outline"
                    size={19}
                    color="#16A36A"
                  />
                  <View>
                    <Text style={styles.priceDetailLabel}>
                      Distância
                    </Text>
                    <Text style={styles.priceDetailValue}>
                      {distanciaEstimada.toFixed(2)} km
                    </Text>
                  </View>
                </View>

                <View style={styles.priceDetail}>
                  <Ionicons
                    name="time-outline"
                    size={19}
                    color="#16A36A"
                  />
                  <View>
                    <Text style={styles.priceDetailLabel}>
                      Duração
                    </Text>
                    <Text style={styles.priceDetailValue}>
                      {Math.ceil(duracaoEstimada)} min
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.fareBreakdown}>
                <Text style={styles.fareBreakdownTitle}>
                  Composição da tarifa
                </Text>

                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Taxa base</Text>
                  <Text style={styles.fareValue}>
                    {formatarKz(TARIFARIO.taxaBase)}
                  </Text>
                </View>

                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Distância</Text>
                  <Text style={styles.fareValue}>
                    {formatarKz(
                      distanciaEstimada * TARIFARIO.precoPorKm
                    )}
                  </Text>
                </View>

                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Tempo</Text>
                  <Text style={styles.fareValue}>
                    {formatarKz(
                      duracaoEstimada *
                        TARIFARIO.precoPorMinuto
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.priceNotice}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color="#9A6B00"
                />
                <Text style={styles.priceNoticeText}>
                  Valor estimado com distância aproximada. O preço
                  definitivo deve ser validado pelo servidor com
                  base nas tarifas oficiais e na rota real.
                </Text>
              </View>

              {/* SOLICITAR MOTORISTA */}

              {estadoPedido === "inicial" ||
              estadoPedido === "erro" ? (
                <TouchableOpacity
                  style={styles.requestButton}
                  onPress={solicitarMotorista}
                  disabled={carregandoPedido}
                >
                  {carregandoPedido ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.requestButtonText}>
                        Solicitar motorista
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={19}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              {/* À PROCURA DE MOTORISTA */}

              {estadoPedido === "procurando" && (
                <View style={styles.searchingCard}>
                  <ActivityIndicator
                    size="large"
                    color="#16A36A"
                  />

                  <Text style={styles.searchingTitle}>
                    À procura de motorista...
                  </Text>

                  <Text style={styles.searchingText}>
                    Estamos a procurar motoristas disponíveis
                    perto da tua localização.
                  </Text>

                  <Text style={styles.requestId}>
                    Pedido #{pedidoId}
                  </Text>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelarPedido}
                    disabled={carregandoPedido}
                  >
                    <Text style={styles.cancelButtonText}>
                      Cancelar solicitação
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* MOTORISTA ENCONTRADO */}

              {estadoPedido === "encontrado" && (
                <View>
                  <View style={styles.foundBanner}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#16A36A"
                    />

                    <Text style={styles.foundBannerText}>
                      Motorista encontrado!
                    </Text>
                  </View>

                  {renderMotorista()}

                  <Text style={styles.requestId}>
                    Pedido #{pedidoId}
                  </Text>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelarPedido}
                    disabled={carregandoPedido}
                  >
                    <Text style={styles.cancelButtonText}>
                      Cancelar viagem
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PEDIDO CANCELADO */}

              {estadoPedido === "cancelado" && (
                <View style={styles.cancelledCard}>
                  <Ionicons
                    name="close-circle-outline"
                    size={35}
                    color="#E65B5B"
                  />

                  <Text style={styles.cancelledTitle}>
                    Solicitação cancelada
                  </Text>

                  <Text style={styles.cancelledText}>
                    Podes fazer uma nova solicitação quando quiseres.
                  </Text>

                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => setEstadoPedido("inicial")}
                  >
                    <Text style={styles.requestButtonText}>
                      Solicitar novamente
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ERRO */}

              {estadoPedido === "erro" && (
                <Text style={styles.errorText}>
                  {erroPedido}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* HISTÓRICO */}

        <Text style={styles.sectionTitle}>
          Histórico de viagens
        </Text>

        <View style={styles.filters}>
          {["Todas", "Ativas", "Concluídas", "Canceladas"].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setFiltro(item)}
              style={[
                styles.filterButton,
                filtro === item && styles.filterActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filtro === item && styles.filterTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {carregandoViagens ? (
          <ActivityIndicator
            size="large"
            color="#16A36A"
            style={styles.historyLoading}
          />
        ) : erroViagens ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{erroViagens}</Text>
            <TouchableOpacity
              onPress={async () => {
                setCarregandoViagens(true);
                setErroViagens("");
                try {
                  setViagens(await listarViagens());
                } catch (error) {
                  setErroViagens(
                    error.message || "Não foi possível carregar o histórico."
                  );
                } finally {
                  setCarregandoViagens(false);
                }
              }}
            >
              <Text style={styles.detailsText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : viagensFiltradas.length > 0 ? (
          viagensFiltradas.map((viagem) => (
            <TouchableOpacity
              key={viagem.id}
              style={styles.tripCard}
              activeOpacity={0.8}
              onPress={() => abrirDetalhesViagem(viagem)}
            >
              <View style={styles.tripHeader}>
                <View style={styles.tripIcon}>
                  <Ionicons
                    name="car-outline"
                    size={25}
                    color="#16A36A"
                  />
                </View>

                <View style={styles.tripInfo}>
                  <Text style={styles.tripTitle}>
                    {viagem.origem_nome || viagem.origem_endereco || "Origem"} →{" "}
                    {viagem.destino_nome || viagem.destino_endereco || "Destino"}
                  </Text>
                  <Text style={styles.tripDate}>
                    {formatarDataViagem(
                      viagem.data_solicitacao || viagem.created_at
                    )}
                  </Text>
                </View>

                <Text style={styles.tripPrice}>
                  {formatarKz(
                    Number(viagem.preco_final ?? viagem.preco_estimado ?? 0)
                  )}
                </Text>
              </View>

              <View style={styles.tripFooter}>
                <View style={styles.status}>
                  <Ionicons
                    name={
                      viagem.estado === "concluida"
                        ? "checkmark-circle"
                        : ["cancelada", "rejeitada"].includes(viagem.estado)
                          ? "close-circle"
                          : "time-outline"
                    }
                    size={16}
                    color={
                      viagem.estado === "concluida"
                        ? "#16A36A"
                        : ["cancelada", "rejeitada"].includes(viagem.estado)
                          ? "#E65B5B"
                          : "#D68B00"
                    }
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          viagem.estado === "concluida"
                            ? "#16A36A"
                            : ["cancelada", "rejeitada"].includes(viagem.estado)
                              ? "#E65B5B"
                              : "#D68B00",
                      },
                    ]}
                  >
                    {formatarEstadoViagem(viagem.estado)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => abrirDetalhesViagem(viagem)}
                  disabled={carregandoDetalhes}
                >
                  <Text style={styles.detailsText}>
                    Ver detalhes
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#16A36A"
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="car-outline"
              size={50}
              color="#BBBBBB"
            />
            <Text style={styles.emptyTitle}>
              Nenhuma viagem encontrada
            </Text>
            <Text style={styles.emptyText}>
              Ainda não existem viagens nesta categoria.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!detalhesViagem}
        transparent
        animationType="slide"
        onRequestClose={() => setDetalhesViagem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da viagem</Text>
              <TouchableOpacity
                onPress={() => setDetalhesViagem(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar detalhes"
              >
                <Ionicons name="close" size={24} color="#667085" />
              </TouchableOpacity>
            </View>
            {carregandoDetalhes ? (
              <ActivityIndicator color="#16A36A" style={styles.historyLoading} />
            ) : detalhesViagem ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailRoute}>
                  {detalhesViagem.origem_nome ||
                    detalhesViagem.origem_endereco ||
                    "Origem"}
                </Text>
                <Text style={styles.detailRoute}>
                  {detalhesViagem.destino_nome ||
                    detalhesViagem.destino_endereco ||
                    "Destino"}
                </Text>
                <View style={styles.detailDivider} />
                <Text style={styles.detailLabel}>Estado</Text>
                <Text style={styles.detailValue}>
                  {formatarEstadoViagem(detalhesViagem.estado)}
                </Text>
                <Text style={styles.detailLabel}>Data</Text>
                <Text style={styles.detailValue}>
                  {formatarDataViagem(
                    detalhesViagem.data_solicitacao ||
                      detalhesViagem.created_at
                  )}
                </Text>
                <Text style={styles.detailLabel}>Preço</Text>
                <Text style={styles.detailValue}>
                  {formatarKz(
                    Number(
                      detalhesViagem.preco_final ??
                        detalhesViagem.preco_estimado ??
                        0
                    )
                  )}
                </Text>
                <Text style={styles.detailLabel}>Pagamento</Text>
                <Text style={styles.detailValue}>
                  {METODOS_PAGAMENTO.find(
                    (metodo) =>
                      metodo.id === detalhesViagem.metodo_pagamento
                  )?.nome || "Não indicado"}
                </Text>
                {detalhesViagem.motorista_nome ? (
                  <>
                    <Text style={styles.detailLabel}>Motorista</Text>
                    <Text style={styles.detailValue}>
                      {detalhesViagem.motorista_nome}
                    </Text>
                    {detalhesViagem.motorista_telefone ? (
                      <Text style={styles.detailValue}>
                        {detalhesViagem.motorista_telefone}
                      </Text>
                    ) : null}
                  </>
                ) : null}

                {detalhesViagem.estado === "concluida" &&
                detalhesViagem.motorista_id &&
                detalhesViagem.avaliacao_passageiro == null ? (
                  <View style={styles.ratingSection}>
                    <Text style={styles.detailLabel}>
                      Avalia o motorista
                    </Text>
                    <View style={styles.ratingButtons}>
                      {[1, 2, 3, 4, 5].map((nota) => (
                        <TouchableOpacity
                          key={nota}
                          onPress={() => setAvaliacaoSelecionada(nota)}
                          accessibilityRole="button"
                          accessibilityLabel={`${nota} estrelas`}
                        >
                          <Ionicons
                            name={
                              nota <= avaliacaoSelecionada
                                ? "star"
                                : "star-outline"
                            }
                            size={30}
                            color="#F5B51B"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.commentInput}
                      value={comentarioAvaliacao}
                      onChangeText={setComentarioAvaliacao}
                      placeholder="Comentário (opcional)"
                      multiline
                      maxLength={500}
                      accessibilityLabel="Comentário da avaliação"
                    />
                    <TouchableOpacity
                      style={[
                        styles.submitRatingButton,
                        enviandoAvaliacao && styles.disabledButton,
                      ]}
                      onPress={submeterAvaliacao}
                      disabled={enviandoAvaliacao}
                    >
                      {enviandoAvaliacao ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitRatingText}>
                          Enviar avaliação
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
                {detalhesViagem.avaliacao_passageiro != null ? (
                  <Text style={styles.detailLabel}>
                    A tua avaliação: {detalhesViagem.avaliacao_passageiro} / 5
                  </Text>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =====================================================
// ESTILOS
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  mapAttribution: {
    color: "#8993A2",
    fontSize: 10,
    marginTop: 8,
    textAlign: "right",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },

  fixedMapSection: {
    height: "50%",
    backgroundColor: "#E9EEF2",
  },

  scrollView: {
    flex: 1,
  },

  header: {
    marginTop: 20,
    marginBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  subtitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A36A",
    letterSpacing: 2,
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#101820",
    marginTop: 5,
  },

  iconButton: {
    width: 45,
    height: 45,
    backgroundColor: "#F4F6F5",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  summary: {
    flexDirection: "row",
    backgroundColor: "#F8FAF9",
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "space-around",
  },

  summaryItem: {
    alignItems: "center",
    flex: 1,
  },

  summaryNumber: {
    fontSize: 21,
    fontWeight: "900",
    color: "#101820",
    marginTop: 8,
  },

  summaryLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
  },

  separator: {
    width: 1,
    height: 55,
    backgroundColor: "#E5E5E5",
  },

  currentLocation: {
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E5EEE9",
    borderRadius: 17,
    padding: 15,
    marginTop: 24,
  },

  currentLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 14,
  },

  currentLocationIcon: {
    width: 42,
    height: 42,
    backgroundColor: "#E5F5ED",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  currentLocationTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#101820",
  },

  currentLocationSubtitle: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
  },

  locationDetails: {
    borderTopWidth: 1,
    borderTopColor: "#E8EDE9",
    paddingTop: 11,
    gap: 10,
  },

  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  locationLabel: {
    color: "#8993A2",
    fontSize: 12,
  },

  locationValue: {
    color: "#173B70",
    fontSize: 12,
    fontWeight: "800",
    maxWidth: "65%",
    textAlign: "right",
  },

  loadingLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },

  loadingText: {
    color: "#777",
    fontSize: 12,
  },

  bookingSection: {
    marginTop: 24,
  },

  mapHeader: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFFE8",
  },

  mapTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#101820",
  },

  mapSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 5,
  },

  nearbyDriverMarker: {
    alignItems: "center",
    width: 48,
    height: 56,
  },

  nearbyDriverPhotoFrame: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: "#E53935",
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 5,
  },

  nearbyDriverPhoto: {
    width: "100%",
    height: "100%",
  },

  nearbyDriverMarkerTip: {
    width: 12,
    height: 12,
    marginTop: -7,
    backgroundColor: "#E53935",
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },

  mapIcon: {
    width: 43,
    height: 43,
    backgroundColor: "#EAF0FA",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  mapContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#E9EEF2",
    position: "relative",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFFCC",
    alignItems: "center",
    justifyContent: "center",
  },

  mapLoadingText: {
    color: "#173B70",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },

  myLocationButton: {
    position: "absolute",
    right: 13,
    bottom: 13,
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  mapInstruction: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EAF0FA",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 9,
  },

  instructionText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#52647B",
  },

  addressFieldsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9EFEB",
    borderRadius: 16,
    paddingHorizontal: 13,
    marginTop: 13,
  },

  addressField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 68,
    gap: 11,
  },

  addressFieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAF9",
    alignItems: "center",
    justifyContent: "center",
  },

  originFieldIcon: {
    backgroundColor: "#E5F5ED",
  },

  addressFieldContent: {
    flex: 1,
  },

  addressFieldLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#8993A2",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  addressFieldInput: {
    minHeight: 27,
    paddingVertical: 2,
    paddingHorizontal: 0,
    fontSize: 13,
    fontWeight: "700",
    color: "#101820",
  },

  addressFieldButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  addressFieldDivider: {
    height: 1,
    backgroundColor: "#E9EFEB",
    marginLeft: 49,
  },

  vehicleSectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#101820",
    marginTop: 23,
    marginBottom: 12,
  },

  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 15,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },

  vehicleCardActive: {
    borderColor: "#16A36A",
    backgroundColor: "#F1FAF5",
  },

  vehicleIcon: {
    width: 49,
    height: 49,
    borderRadius: 13,
    backgroundColor: "#EAF0FA",
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleIconActive: {
    backgroundColor: "#16A36A",
  },

  vehicleInfo: {
    flex: 1,
    marginLeft: 13,
  },

  vehicleName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#173B70",
  },

  vehicleDescription: {
    fontSize: 11,
    color: "#8993A2",
    marginTop: 5,
  },

  vehicleSelection: {
    marginHorizontal: 5,
  },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#C5CDD5",
  },

  confirmButton: {
    minHeight: 53,
    backgroundColor: "#16A36A",
    borderRadius: 14,
    marginTop: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  disabledButton: {
    backgroundColor: "#A7CDBB",
  },

  confirmButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  priceCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDECE3",
    borderRadius: 18,
    padding: 16,
    marginTop: 17,
    elevation: 2,
  },

  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  priceTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#173B70",
  },

  priceSubtitle: {
    fontSize: 10,
    color: "#8993A2",
    marginTop: 5,
  },

  priceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E5F5ED",
    alignItems: "center",
    justifyContent: "center",
  },

  priceMain: {
    alignItems: "center",
    backgroundColor: "#F0F8F3",
    padding: 17,
    borderRadius: 14,
    marginTop: 16,
  },

  priceLabel: {
    fontSize: 11,
    color: "#64748B",
  },

  priceValue: {
    fontSize: 29,
    fontWeight: "900",
    color: "#16A36A",
    marginTop: 7,
  },

  priceDivider: {
    height: 1,
    backgroundColor: "#E9EFEB",
    marginVertical: 15,
  },

  priceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  priceDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  priceDetailLabel: {
    fontSize: 10,
    color: "#8993A2",
  },

  priceDetailValue: {
    fontSize: 13,
    color: "#173B70",
    fontWeight: "900",
    marginTop: 4,
  },

  fareBreakdown: {
    borderTopWidth: 1,
    borderTopColor: "#E9EFEB",
    marginTop: 16,
    paddingTop: 13,
    gap: 11,
  },

  fareBreakdownTitle: {
    fontSize: 12,
    color: "#173B70",
    fontWeight: "900",
    marginBottom: 2,
  },

  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  fareLabel: {
    color: "#8993A2",
    fontSize: 11,
  },

  fareValue: {
    color: "#173B70",
    fontSize: 11,
    fontWeight: "800",
  },

  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 8,
  },

  paymentMethod: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  paymentMethodActive: {
    backgroundColor: "#173B70",
    borderColor: "#173B70",
  },

  paymentMethodText: {
    color: "#173B70",
    fontSize: 11,
    fontWeight: "700",
  },

  paymentMethodTextActive: {
    color: "#FFFFFF",
  },

  priceNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF5D9",
    borderRadius: 11,
    padding: 11,
    marginTop: 16,
    gap: 8,
  },

  priceNoticeText: {
    flex: 1,
    color: "#745719",
    fontSize: 10,
    lineHeight: 16,
  },

  requestButton: {
    minHeight: 52,
    backgroundColor: "#173B70",
    borderRadius: 13,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 12,
  },

  requestButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  searchingCard: {
    alignItems: "center",
    backgroundColor: "#F4F8FC",
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
  },

  searchingTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#173B70",
    marginTop: 15,
  },

  searchingText: {
    fontSize: 12,
    color: "#778397",
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },

  requestId: {
    fontSize: 10,
    color: "#8993A2",
    marginTop: 13,
  },

  cancelButton: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E65B5B",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 11,
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#E65B5B",
  },

  foundBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E5F5ED",
    padding: 13,
    borderRadius: 12,
    marginTop: 16,
  },

  foundBannerText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#16A36A",
  },

  driverCard: {
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E5EEE9",
    padding: 14,
    borderRadius: 15,
    marginTop: 13,
  },

  driverSectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#173B70",
    marginBottom: 14,
  },

  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  driverPhoto: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E5EAF0",
  },

  driverPhotoPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E5EAF0",
    alignItems: "center",
    justifyContent: "center",
  },

  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },

  driverName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#101820",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },

  driverRating: {
    fontSize: 11,
    fontWeight: "800",
    color: "#173B70",
  },

  driverVehicle: {
    fontSize: 11,
    color: "#8993A2",
    marginTop: 5,
  },

  driverConfirmed: {
    alignItems: "center",
    gap: 3,
  },

  driverConfirmedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#16A36A",
  },

  plateBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  plateLabel: {
    fontSize: 11,
    color: "#8993A2",
  },

  plateValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#173B70",
  },

  contactButton: {
    backgroundColor: "#16A36A",
    borderRadius: 11,
    padding: 13,
    marginTop: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  cancelledCard: {
    alignItems: "center",
    padding: 17,
    marginTop: 15,
    backgroundColor: "#FFF5F5",
    borderRadius: 13,
  },

  cancelledTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#E65B5B",
    marginTop: 8,
  },

  cancelledText: {
    fontSize: 11,
    color: "#8993A2",
    marginTop: 6,
    textAlign: "center",
  },

  errorText: {
    color: "#E65B5B",
    fontSize: 11,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#101820",
    marginTop: 32,
    marginBottom: 15,
  },

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  historyLoading: {
    paddingVertical: 25,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(16, 24, 32, 0.55)",
    padding: 20,
  },

  modalCard: {
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  modalTitle: {
    color: "#101820",
    fontSize: 18,
    fontWeight: "900",
  },

  detailRoute: {
    color: "#173B70",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 9,
  },

  detailDivider: {
    height: 1,
    backgroundColor: "#E9EFEB",
    marginVertical: 8,
  },

  detailLabel: {
    color: "#8993A2",
    fontSize: 11,
    marginTop: 10,
  },

  detailValue: {
    color: "#101820",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },

  ratingSection: {
    borderTopWidth: 1,
    borderTopColor: "#E9EFEB",
    marginTop: 18,
    paddingTop: 8,
  },

  ratingButtons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 12,
  },

  commentInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 12,
    padding: 12,
    color: "#101820",
    textAlignVertical: "top",
  },

  submitRatingButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#16A36A",
    marginTop: 12,
  },

  submitRatingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    backgroundColor: "#F4F6F5",
    borderRadius: 12,
  },

  filterActive: {
    backgroundColor: "#16A36A",
  },

  filterText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  tripCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
  },

  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#E5F5ED",
    alignItems: "center",
    justifyContent: "center",
  },

  tripInfo: {
    flex: 1,
    marginLeft: 12,
  },

  tripTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#101820",
  },

  tripDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 6,
  },

  tripPrice: {
    fontSize: 13,
    fontWeight: "900",
    color: "#101820",
  },

  tripFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    marginTop: 15,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  detailsText: {
    color: "#16A36A",
    fontSize: 11,
    fontWeight: "800",
  },

  empty: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 15,
    color: "#101820",
  },

  emptyText: {
    color: "#888",
    fontSize: 12,
    marginTop: 7,
  },
});
