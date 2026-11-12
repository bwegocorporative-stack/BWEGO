import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "../components/TripMap";
import { API_URL } from "../config/api";
import { obterToken, terminarSessao } from "../services/authSession";
import {
  atualizarDisponibilidadeMotorista,
  atualizarLocalizacaoMotorista,
} from "../services/motoristas";
import {
  aceitarViagemMotorista,
  atualizarEstadoViagemMotorista,
  listarPedidosViagemPerto,
  listarViagens,
  obterViagemAtivaMotorista,
} from "../services/viagens";

const PROXIMO_ESTADO = {
  aceite: "motorista_a_caminho",
  motorista_a_caminho: "motorista_chegou",
  motorista_chegou: "em_andamento",
  em_andamento: "concluida",
};

const ACAO_ESTADO = {
  aceite: "Iniciar deslocação",
  motorista_a_caminho: "Cheguei ao ponto",
  motorista_chegou: "Iniciar viagem",
  em_andamento: "Concluir viagem",
};

const DESCRICAO_ESTADO = {
  aceite: "Pedido aceite. Segue para o ponto de recolha.",
  motorista_a_caminho: "A caminho do passageiro.",
  motorista_chegou: "Chegaste ao ponto de recolha.",
  em_andamento: "Viagem em curso.",
};

const REGIAO_PADRAO = {
  latitude: -8.8383,
  longitude: 13.2344,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

function formatarKz(valor) {
  const numero = Number(valor);
  return `${Number.isFinite(numero) ? Math.ceil(numero).toLocaleString("pt-AO") : "0"} Kz`;
}

function formatarDistancia(valor) {
  const distancia = Number(valor);
  if (!Number.isFinite(distancia)) return "Distância indisponível";
  return distancia < 1
    ? `${Math.max(100, Math.round(distancia * 1000 / 100) * 100)} m de ti`
    : `${distancia.toFixed(1)} km de ti`;
}

function formatarData(valor) {
  if (!valor) return "Agora";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Agora";
  return data.toLocaleString("pt-AO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatarMetodoPagamento(metodo) {
  return {
    dinheiro: "Dinheiro",
    carteira: "Carteira Bwé-Go",
    multicaixa: "Multicaixa Express",
    transferencia: "Transferência",
  }[metodo] || "Pagamento não indicado";
}

function coordenadasValidas(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;
}

function coordenadasViagem(viagem, prefixo) {
  const latitude = viagem?.[`${prefixo}_latitude`];
  const longitude = viagem?.[`${prefixo}_longitude`];
  if (!coordenadasValidas(latitude, longitude)) return null;
  return { latitude: Number(latitude), longitude: Number(longitude) };
}

function formatarEstadoAprovacao(estado) {
  return {
    pendente: "Cadastro em análise",
    rejeitado: "Cadastro não aprovado",
    suspenso: "Conta suspensa",
  }[estado] || "Conta não disponível";
}

export default function MotoristaScreen() {
  const [motorista, setMotorista] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [erroAtividade, setErroAtividade] = useState("");
  const [erroLocalizacao, setErroLocalizacao] = useState("");
  const [posicao, setPosicao] = useState(null);
  const [permissaoLocalizacao, setPermissaoLocalizacao] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [atualizandoDisponibilidade, setAtualizandoDisponibilidade] = useState(false);
  const [aAtualizarAtividade, setAAtualizarAtividade] = useState(false);
  const [acaoEmCurso, setAcaoEmCurso] = useState(null);
  const subscricaoLocalizacao = useRef(null);
  const versaoAtividade = useRef(0);
  const estadoAprovacao = motorista?.estado_aprovacao;
  const disponibilidade = motorista?.disponibilidade;
  const motoristaId = motorista?.id;

  const buscarPerfil = useCallback(async () => {
    const token = await obterToken();
    if (!token) return null;

    const resposta = await fetch(`${API_URL}/motoristas/perfil`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const resultado = await resposta.json();

    if (resposta.status === 401) await terminarSessao();
    if (!resposta.ok) {
      const error = new Error(
        resultado.mensagem || "Não foi possível carregar o perfil."
      );
      error.status = resposta.status;
      throw error;
    }

    return resultado.motorista;
  }, []);

  const carregarAtividade = useCallback(async (mostrarIndicador = false) => {
    if (!motorista || motorista.estado_aprovacao !== "aprovado") return;
    const versao = ++versaoAtividade.current;
    if (mostrarIndicador) setAAtualizarAtividade(true);

    try {
      const [ativa, pedidosDisponiveis] = await Promise.all([
        obterViagemAtivaMotorista(),
        motorista.disponibilidade === "disponivel"
          ? listarPedidosViagemPerto()
          : Promise.resolve([]),
      ]);
      if (versao !== versaoAtividade.current) return;
      setViagemAtiva(ativa);
      setPedidos(ativa ? [] : pedidosDisponiveis);
      setErroAtividade("");
    } catch (error) {
      if (versao === versaoAtividade.current) {
        setErroAtividade(
          error.message || "Não foi possível atualizar os pedidos."
        );
      }
    } finally {
      if (versao === versaoAtividade.current && mostrarIndicador) {
        setAAtualizarAtividade(false);
      }
    }
  }, [motorista]);

  useEffect(() => {
    let ativo = true;
    buscarPerfil()
      .then((perfil) => {
        if (!ativo) return;
        if (!perfil) {
          router.replace("/login");
          return;
        }
        setMotorista(perfil);
      })
      .catch((error) => {
        if (!ativo) return;
        setErro(error.message || "Não foi possível ligar ao servidor.");
        if (error.status === 401) router.replace("/login");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [buscarPerfil]);

  useEffect(() => {
    if (estadoAprovacao !== "aprovado") return undefined;

    let ativo = true;
    let enviandoLocalizacao = false;
    let intervaloLocalizacao;

    const enviarLocalizacao = async (coordenadas) => {
      if (enviandoLocalizacao) return;
      enviandoLocalizacao = true;
      try {
        const posicaoAtual = coordenadas
          ? { coords: coordenadas }
          : await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
        const localizacao = {
          latitude: posicaoAtual.coords.latitude,
          longitude: posicaoAtual.coords.longitude,
        };
        await atualizarLocalizacaoMotorista(
          localizacao.latitude,
          localizacao.longitude
        );
        if (ativo) {
          setPosicao(localizacao);
          setErroLocalizacao("");
        }
      } catch (error) {
        if (ativo) {
          setErroLocalizacao(
            error.message || "Não foi possível atualizar a localização."
          );
        }
      } finally {
        enviandoLocalizacao = false;
      }
    };

    const iniciarAtualizacoes = async () => {
      if (!["disponivel", "ocupado"].includes(disponibilidade)) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (ativo) setPermissaoLocalizacao(false);
        throw new Error(
          "Permite o acesso à localização para receber pedidos e acompanhar viagens."
        );
      }
      if (ativo) setPermissaoLocalizacao(true);

      await enviarLocalizacao();
      const subscricao = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        (novaPosicao) => void enviarLocalizacao(novaPosicao.coords)
      );

      if (ativo) {
        subscricaoLocalizacao.current = subscricao;
        intervaloLocalizacao = setInterval(
          () => void enviarLocalizacao(),
          30000
        );
      } else {
        subscricao.remove();
      }
    };

    iniciarAtualizacoes().catch(async (error) => {
      if (!ativo) return;
      setErroLocalizacao(
        error.message || "Não foi possível iniciar a localização."
      );
      if (disponibilidade === "disponivel") {
        try {
          await atualizarDisponibilidadeMotorista("offline");
          if (ativo) {
            setMotorista((atual) => ({
              ...atual,
              disponibilidade: "offline",
            }));
          }
          setPermissaoLocalizacao(false);
        } catch (erroDisponibilidade) {
          if (ativo) {
            setErroLocalizacao(
              `${error.message} ${erroDisponibilidade.message || ""}`.trim()
            );
          }
        }
      }
    });

    return () => {
      ativo = false;
      subscricaoLocalizacao.current?.remove();
      subscricaoLocalizacao.current = null;
      clearInterval(intervaloLocalizacao);
    };
  }, [estadoAprovacao, disponibilidade]);

  useEffect(() => {
    if (!motoristaId || estadoAprovacao !== "aprovado") return undefined;
    let ativo = true;

    const atualizar = async () => {
      await carregarAtividade();
      try {
        const viagens = await listarViagens();
        if (!ativo) return;
        setHistorico(
          viagens
            .filter((viagem) =>
              Number(viagem.motorista_id) === Number(motoristaId) &&
              viagem.estado === "concluida"
            )
            .slice(0, 5)
        );
      } catch (error) {
        if (ativo) {
          setErroAtividade(
            error.message || "Não foi possível carregar o histórico."
          );
        }
      }
    };

    void atualizar();
    const intervalo = setInterval(() => void carregarAtividade(), 12000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      versaoAtividade.current += 1;
    };
  }, [motoristaId, estadoAprovacao, carregarAtividade]);

  const carregarPerfil = async () => {
    setLoading(true);
    setErro("");
    try {
      const perfil = await buscarPerfil();
      if (!perfil) {
        router.replace("/login");
        return;
      }
      setMotorista(perfil);
    } catch (error) {
      setErro(error.message || "Não foi possível ligar ao servidor.");
      if (error.status === 401) router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const alternarDisponibilidade = async () => {
    if (!motorista || motorista.disponibilidade === "ocupado") return;
    setAtualizandoDisponibilidade(true);
    setErroLocalizacao("");

    try {
      if (motorista.disponibilidade === "disponivel") {
        await atualizarDisponibilidadeMotorista("offline");
        setPermissaoLocalizacao(false);
        setMotorista((atual) => ({ ...atual, disponibilidade: "offline" }));
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error(
            "Permite o acesso à localização para ficares disponível."
          );
        }
        setPermissaoLocalizacao(true);
        const posicaoAtual = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const novaPosicao = {
          latitude: posicaoAtual.coords.latitude,
          longitude: posicaoAtual.coords.longitude,
        };
        await atualizarLocalizacaoMotorista(
          novaPosicao.latitude,
          novaPosicao.longitude
        );
        setPosicao(novaPosicao);
        await atualizarDisponibilidadeMotorista("disponivel");
        setMotorista((atual) => ({ ...atual, disponibilidade: "disponivel" }));
      }
    } catch (error) {
      setErroLocalizacao(
        error.message || "Não foi possível alterar a disponibilidade."
      );
    } finally {
      setAtualizandoDisponibilidade(false);
    }
  };

  const aceitarPedido = async (pedido) => {
    setAcaoEmCurso(String(pedido.id));
    setErroAtividade("");
    try {
      await aceitarViagemMotorista(pedido.id);
      const perfil = await buscarPerfil();
      if (perfil) setMotorista(perfil);
      await carregarAtividade(true);
    } catch (error) {
      setErroAtividade(error.message || "Não foi possível aceitar este pedido.");
      await carregarAtividade();
    } finally {
      setAcaoEmCurso(null);
    }
  };

  const avancarViagem = async () => {
    if (!viagemAtiva) return;
    const novoEstado = PROXIMO_ESTADO[viagemAtiva.estado];
    if (!novoEstado) return;
    setAcaoEmCurso(String(viagemAtiva.id));
    setErroAtividade("");
    try {
      await atualizarEstadoViagemMotorista(viagemAtiva.id, novoEstado);
      const [ativa, viagens] = await Promise.all([
        obterViagemAtivaMotorista(),
        listarViagens(),
      ]);
      setViagemAtiva(ativa);
      setPedidos([]);
      setHistorico(
        viagens
          .filter((viagem) =>
            Number(viagem.motorista_id) === Number(motorista?.id) &&
            viagem.estado === "concluida"
          )
          .slice(0, 5)
      );
      if (novoEstado === "concluida") {
        const perfil = await buscarPerfil();
        if (perfil) setMotorista(perfil);
      }
    } catch (error) {
      setErroAtividade(
        error.message || "Não foi possível atualizar o estado da viagem."
      );
      await carregarAtividade();
    } finally {
      setAcaoEmCurso(null);
    }
  };

  const abrirNavegacao = async (destino) => {
    if (!destino) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destino.latitude},${destino.longitude}&travelmode=driving`;
    try {
      await Linking.openURL(url);
    } catch {
      setErroAtividade("Não foi possível abrir a navegação neste dispositivo.");
    }
  };

  const ligarPassageiro = async () => {
    const telefone = viagemAtiva?.passageiro_telefone;
    if (!telefone) {
      setErroAtividade("O passageiro não tem um telefone disponível.");
      return;
    }
    try {
      await Linking.openURL(`tel:${telefone}`);
    } catch {
      setErroAtividade("Não foi possível iniciar a chamada.");
    }
  };

  const sair = async () => {
    if (viagemAtiva) {
      setErroAtividade("Conclui a viagem ativa antes de terminar a sessão.");
      return;
    }
    try {
      if (motorista?.disponibilidade === "disponivel") {
        await atualizarDisponibilidadeMotorista("offline");
      }
      await terminarSessao();
      router.replace("/login");
    } catch (error) {
      setErroLocalizacao(
        error.message || "Não foi possível terminar a sessão."
      );
    }
  };

  const estado = motorista?.estado_aprovacao || "pendente";
  const aprovado = estado === "aprovado";
  const disponivel = motorista?.disponibilidade === "disponivel";
  const ocupado = motorista?.disponibilidade === "ocupado";
  const origemAtiva = coordenadasViagem(viagemAtiva, "origem");
  const destinoAtivo = coordenadasViagem(viagemAtiva, "destino");
  const coordenadasPerfil =
    coordenadasValidas(motorista?.latitude, motorista?.longitude)
      ? {
          latitude: Number(motorista.latitude),
          longitude: Number(motorista.longitude),
        }
      : null;
  const centroMapa = posicao || coordenadasPerfil;
  const regiaoMapa = centroMapa
    ? { ...centroMapa, latitudeDelta: 0.06, longitudeDelta: 0.06 }
    : REGIAO_PADRAO;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#173B70" />
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="car-sport" size={25} color="#173B70" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brand}>BWÉ-GO MOTORISTA</Text>
          <Text style={styles.headerName}>
            {motorista?.nome ? `Olá, ${motorista.nome}` : "A tua área de trabalho"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => void carregarAtividade(true)}
          disabled={!aprovado || aAtualizarAtividade}
          accessibilityRole="button"
          accessibilityLabel="Atualizar pedidos e viagem ativa"
        >
          {aAtualizarAtividade ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={21} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color="#173B70" />
            <Text style={styles.mutedText}>A carregar a área do motorista...</Text>
          </View>
        ) : erro ? (
          <View style={styles.centerCard}>
            <Ionicons name="alert-circle-outline" size={42} color="#D99B08" />
            <Text style={styles.sectionTitle}>Não foi possível carregar o perfil</Text>
            <Text style={styles.mutedText}>{erro}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={carregarPerfil}>
              <Text style={styles.primaryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : !aprovado ? (
          <View style={styles.centerCard}>
            <View style={styles.pendingIcon}>
              <Ionicons name="time-outline" size={36} color="#D99B08" />
            </View>
            <Text style={styles.sectionTitle}>
              {formatarEstadoAprovacao(estado)}
            </Text>
            <Text style={styles.mutedText}>
              A área de viagens e os pedidos próximos ficam disponíveis depois
              da aprovação do teu cadastro pela equipa Bwé-Go.
            </Text>
            {motorista?.matricula ? (
              <Text style={styles.vehicleText}>
                {motorista.marca_veiculo} {motorista.modelo_veiculo} · {motorista.matricula}
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.statusCard}>
              <View style={styles.driverIdentity}>
                <View style={styles.avatar}>
                  {motorista?.foto_url ? (
                    <Image
                      source={{ uri: motorista.foto_url }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={24} color="#173B70" />
                  )}
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.sectionTitle}>
                    {motorista?.marca_veiculo} {motorista?.modelo_veiculo}
                  </Text>
                  <Text style={styles.mutedText}>
                    {motorista?.matricula || "Veículo por configurar"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    disponivel ? styles.onlineBadge : ocupado ? styles.busyBadge : styles.offlineBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      disponivel ? styles.onlineDot : ocupado ? styles.busyDot : styles.offlineDot,
                    ]}
                  />
                  <Text style={styles.statusBadgeText}>
                    {disponivel ? "Online" : ocupado ? "Em viagem" : "Offline"}
                  </Text>
                </View>
              </View>
              <View style={styles.driverStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{motorista?.total_viagens ?? 0}</Text>
                  <Text style={styles.statLabel}>viagens</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {Number(motorista?.avaliacao_media || 0).toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>avaliação</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.availabilityButton,
                    disponivel && styles.goOfflineButton,
                    ocupado && styles.disabledButton,
                  ]}
                  onPress={alternarDisponibilidade}
                  disabled={atualizandoDisponibilidade || ocupado}
                  accessibilityRole="button"
                >
                  {atualizandoDisponibilidade ? (
                    <ActivityIndicator
                      size="small"
                      color={disponivel ? "#173B70" : "#FFFFFF"}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.availabilityButtonText,
                        disponivel && styles.goOfflineText,
                      ]}
                    >
                      {ocupado ? "Em viagem" : disponivel ? "Ficar offline" : "Ficar online"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              {!!erroLocalizacao && (
                <Text style={styles.inlineError}>{erroLocalizacao}</Text>
              )}
            </View>

            <View style={styles.mapCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Mapa de trabalho</Text>
                  <Text style={styles.mutedText}>
                    {viagemAtiva
                      ? "Acompanhe o ponto de recolha e o destino."
                      : disponivel
                        ? "Pedidos imediatos até 10 km de ti."
                        : "Fica online para receber pedidos próximos."}
                  </Text>
                </View>
                <Ionicons name="navigate-circle-outline" size={25} color="#173B70" />
              </View>
              <MapView
                style={styles.map}
                region={regiaoMapa}
                showsUserLocation={permissaoLocalizacao}
                showsMyLocationButton={false}
                showsCompass
                loadingEnabled
                toolbarEnabled={false}
              >
                {pedidos.map((pedido) => {
                  const coordenadas = coordenadasViagem(pedido, "origem");
                  if (!coordenadas) return null;
                  return (
                    <Marker
                      key={`pedido-${pedido.id}`}
                      coordinate={coordenadas}
                      title={pedido.passageiro_nome || "Pedido de viagem"}
                      description={`${pedido.origem_nome} → ${pedido.destino_nome}`}
                      pinColor="#F5B51B"
                    />
                  );
                })}
                {origemAtiva && (
                  <Marker
                    coordinate={origemAtiva}
                    title="Ponto de recolha"
                    description={viagemAtiva?.origem_nome}
                    pinColor="#F5B51B"
                  />
                )}
                {destinoAtivo && (
                  <Marker
                    coordinate={destinoAtivo}
                    title="Destino"
                    description={viagemAtiva?.destino_nome}
                    pinColor="#1C8B59"
                  />
                )}
                {origemAtiva && destinoAtivo && (
                  <Polyline
                    coordinates={[origemAtiva, destinoAtivo]}
                    strokeColor="#173B70"
                    strokeWidth={4}
                  />
                )}
              </MapView>
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.pickupLegend]} />
                  <Text style={styles.legendText}>Recolha</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.destinationLegend]} />
                  <Text style={styles.legendText}>Destino</Text>
                </View>
                <Text style={styles.mapCount}>
                  {viagemAtiva ? "Viagem ativa" : `${pedidos.length} pedidos`}
                </Text>
              </View>
            </View>

            {viagemAtiva ? (
              <View style={styles.activeCard}>
                <View style={styles.activeHeading}>
                  <View style={styles.activeIcon}>
                    <Ionicons name="car" size={22} color="#173B70" />
                  </View>
                  <View style={styles.activeHeadingText}>
                    <Text style={styles.sectionTitle}>Viagem ativa</Text>
                    <Text style={styles.activeStatus}>
                      {DESCRICAO_ESTADO[viagemAtiva.estado] || "Viagem em curso"}
                    </Text>
                  </View>
                  <Text style={styles.price}>{formatarKz(viagemAtiva.preco_estimado)}</Text>
                </View>
                <View style={styles.passengerRow}>
                  <View style={styles.passengerAvatar}>
                    {viagemAtiva.passageiro_foto_url ? (
                      <Image
                        source={{ uri: viagemAtiva.passageiro_foto_url }}
                        style={styles.passengerImage}
                      />
                    ) : (
                      <Ionicons name="person" size={18} color="#173B70" />
                    )}
                  </View>
                  <View style={styles.identityText}>
                    <Text style={styles.passengerName}>
                      {viagemAtiva.passageiro_nome || "Passageiro"}
                    </Text>
                    <Text style={styles.mutedText}>
                      {viagemAtiva.numero_passageiros || 1} passageiro(s)
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={ligarPassageiro}
                    accessibilityRole="button"
                    accessibilityLabel="Ligar ao passageiro"
                  >
                    <Ionicons name="call-outline" size={19} color="#173B70" />
                  </TouchableOpacity>
                </View>
                <View style={styles.routeRow}>
                  <View style={styles.routeRail}>
                    <View style={styles.routeStart} />
                    <View style={styles.routeLine} />
                    <View style={styles.routeEnd} />
                  </View>
                  <View style={styles.routeLabels}>
                    <Text style={styles.routeTitle} numberOfLines={1}>
                      {viagemAtiva.origem_nome || viagemAtiva.origem_endereco || "Ponto de recolha"}
                    </Text>
                    <Text style={styles.routeSubtitle} numberOfLines={1}>
                      {viagemAtiva.origem_endereco}
                    </Text>
                    <Text style={[styles.routeTitle, styles.destinationTitle]} numberOfLines={1}>
                      {viagemAtiva.destino_nome || viagemAtiva.destino_endereco || "Destino"}
                    </Text>
                    <Text style={styles.routeSubtitle} numberOfLines={1}>
                      {viagemAtiva.destino_endereco}
                    </Text>
                  </View>
                </View>
                <Text style={styles.paymentInfo}>
                  Pagamento: {formatarMetodoPagamento(viagemAtiva.metodo_pagamento)}
                </Text>
                {!!erroAtividade && (
                  <Text style={styles.inlineError}>{erroAtividade}</Text>
                )}
                <View style={styles.activeActions}>
                  <TouchableOpacity
                    style={styles.navigationButton}
                    onPress={() => abrirNavegacao(
                      viagemAtiva.estado === "em_andamento" ? destinoAtivo : origemAtiva
                    )}
                    accessibilityRole="button"
                  >
                    <Ionicons name="navigate-outline" size={18} color="#173B70" />
                    <Text style={styles.navigationButtonText}>Navegar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={avancarViagem}
                    disabled={acaoEmCurso === String(viagemAtiva.id)}
                    accessibilityRole="button"
                  >
                    {acaoEmCurso === String(viagemAtiva.id) ? (
                      <ActivityIndicator color="#173B70" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {ACAO_ESTADO[viagemAtiva.estado] || "Atualizar viagem"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.requestsSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Pedidos próximos</Text>
                    <Text style={styles.mutedText}>
                      {disponivel
                        ? "Aceita um pedido para iniciar a viagem."
                        : "Fica online para ver os pedidos."}
                    </Text>
                  </View>
                  <Text style={styles.requestCount}>{pedidos.length}</Text>
                </View>
                {!!erroAtividade && (
                  <Text style={styles.inlineError}>{erroAtividade}</Text>
                )}
                {!disponivel ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="radio-outline" size={26} color="#8090A4" />
                    <Text style={styles.emptyText}>Estás offline e não recebes novos pedidos.</Text>
                  </View>
                ) : pedidos.length === 0 ? (
                  <View style={styles.emptyState}>
                    {aAtualizarAtividade ? (
                      <ActivityIndicator color="#173B70" />
                    ) : (
                      <Ionicons name="search-outline" size={26} color="#8090A4" />
                    )}
                    <Text style={styles.emptyText}>
                      {aAtualizarAtividade
                        ? "A procurar passageiros perto de ti..."
                        : "Ainda não há pedidos próximos. Continuaremos a procurar."}
                    </Text>
                  </View>
                ) : (
                  pedidos.map((pedido) => (
                    <View key={pedido.id} style={styles.requestCard}>
                      <View style={styles.requestTop}>
                        <View style={styles.requestPassengerIcon}>
                          <Ionicons name="person-outline" size={19} color="#173B70" />
                        </View>
                        <View style={styles.identityText}>
                          <Text style={styles.passengerName}>
                            {pedido.passageiro_nome || "Novo passageiro"}
                          </Text>
                          <Text style={styles.mutedText}>
                            {formatarDistancia(pedido.distancia_motorista_km)} · {formatarData(pedido.data_solicitacao)}
                          </Text>
                        </View>
                        <Text style={styles.price}>{formatarKz(pedido.preco_estimado)}</Text>
                      </View>
                      <View style={styles.requestRoute}>
                        <Text style={styles.requestRouteText} numberOfLines={1}>
                          <Text style={styles.routeStartText}>Recolha: </Text>
                          {pedido.origem_nome || pedido.origem_endereco}
                        </Text>
                        <Text style={styles.requestRouteText} numberOfLines={1}>
                          <Text style={styles.destinationText}>Destino: </Text>
                          {pedido.destino_nome || pedido.destino_endereco}
                        </Text>
                      </View>
                      <View style={styles.requestMeta}>
                        <Text style={styles.metaChip}>
                          {Number(pedido.distancia_km || 0).toFixed(1)} km
                        </Text>
                        <Text style={styles.metaChip}>
                          {pedido.numero_passageiros || 1} passageiro(s)
                        </Text>
                        <Text style={styles.metaChip}>
                          {pedido.categoria || "Económico"}
                        </Text>
                        <Text style={styles.metaChip}>
                          {formatarMetodoPagamento(pedido.metodo_pagamento)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => void aceitarPedido(pedido)}
                        disabled={acaoEmCurso !== null}
                        accessibilityRole="button"
                      >
                        {acaoEmCurso === String(pedido.id) ? (
                          <ActivityIndicator color="#173B70" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={19} color="#173B70" />
                            <Text style={styles.primaryButtonText}>Aceitar viagem</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Viagens recentes</Text>
              {historico.length === 0 ? (
                <Text style={styles.mutedText}>As viagens concluídas aparecerão aqui.</Text>
              ) : (
                historico.map((viagem) => (
                  <View key={viagem.id} style={styles.historyItem}>
                    <View style={styles.historyIcon}>
                      <Ionicons name="checkmark" size={16} color="#1C8B59" />
                    </View>
                    <View style={styles.identityText}>
                      <Text style={styles.historyRoute} numberOfLines={1}>
                        {viagem.origem_nome} → {viagem.destino_nome}
                      </Text>
                      <Text style={styles.mutedText}>
                        {formatarData(viagem.data_conclusao || viagem.data_solicitacao)}
                      </Text>
                    </View>
                    <Text style={styles.historyPrice}>
                      {formatarKz(viagem.preco_final || viagem.preco_estimado)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={() => void sair()}>
          <Ionicons name="log-out-outline" size={20} color="#173B70" />
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    minHeight: 82,
    backgroundColor: "#173B70",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  brand: {
    color: "#C9D7EC",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headerName: {
    marginTop: 3,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
    gap: 14,
  },
  centerCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  pendingIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFF7E4",
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    gap: 14,
    elevation: 2,
    shadowColor: "#173B70",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  driverIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8EEF7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  identityText: {
    flex: 1,
  },
  sectionTitle: {
    color: "#173B70",
    fontSize: 16,
    fontWeight: "900",
  },
  mutedText: {
    color: "#758195",
    fontSize: 12,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineBadge: {
    backgroundColor: "#E7F5ED",
  },
  busyBadge: {
    backgroundColor: "#FFF4D6",
  },
  offlineBadge: {
    backgroundColor: "#EEF1F5",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: "#1C8B59",
  },
  busyDot: {
    backgroundColor: "#D99B08",
  },
  offlineDot: {
    backgroundColor: "#8090A4",
  },
  statusBadgeText: {
    color: "#344054",
    fontSize: 11,
    fontWeight: "800",
  },
  driverStats: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
    paddingTop: 12,
    gap: 14,
  },
  stat: {
    alignItems: "center",
    minWidth: 52,
  },
  statValue: {
    color: "#173B70",
    fontSize: 15,
    fontWeight: "900",
  },
  statLabel: {
    color: "#758195",
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E7EAF0",
  },
  availabilityButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#F5B51B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  goOfflineButton: {
    backgroundColor: "#E8EDF4",
  },
  disabledButton: {
    backgroundColor: "#FFF4D6",
  },
  availabilityButtonText: {
    color: "#173B70",
    fontSize: 12,
    fontWeight: "900",
  },
  goOfflineText: {
    color: "#344054",
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    gap: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  map: {
    height: 260,
    borderRadius: 14,
  },
  mapLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  pickupLegend: {
    backgroundColor: "#F5B51B",
  },
  destinationLegend: {
    backgroundColor: "#1C8B59",
  },
  legendText: {
    color: "#758195",
    fontSize: 10,
  },
  mapCount: {
    marginLeft: "auto",
    color: "#173B70",
    fontSize: 11,
    fontWeight: "800",
  },
  requestsSection: {
    gap: 12,
  },
  requestCount: {
    minWidth: 28,
    height: 28,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#E8EEF7",
    color: "#173B70",
    fontSize: 13,
    fontWeight: "900",
    paddingTop: 5,
  },
  emptyState: {
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  emptyText: {
    color: "#758195",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  requestCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    gap: 12,
    elevation: 1,
    shadowColor: "#173B70",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  requestTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requestPassengerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8EEF7",
    alignItems: "center",
    justifyContent: "center",
  },
  passengerName: {
    color: "#173B70",
    fontSize: 13,
    fontWeight: "900",
  },
  price: {
    color: "#173B70",
    fontSize: 13,
    fontWeight: "900",
  },
  requestRoute: {
    paddingLeft: 6,
    gap: 7,
  },
  requestRouteText: {
    color: "#475467",
    fontSize: 12,
  },
  routeStartText: {
    color: "#B58100",
    fontWeight: "900",
  },
  destinationText: {
    color: "#1C8B59",
    fontWeight: "900",
  },
  requestMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#F3F5F8",
    color: "#526176",
    fontSize: 10,
    fontWeight: "700",
  },
  acceptButton: {
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: "#F5B51B",
  },
  activeCard: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    gap: 14,
  },
  activeHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#E8EEF7",
    alignItems: "center",
    justifyContent: "center",
  },
  activeHeadingText: {
    flex: 1,
  },
  activeStatus: {
    marginTop: 3,
    color: "#758195",
    fontSize: 11,
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#EEF1F5",
  },
  passengerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8EEF7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  passengerImage: {
    width: 36,
    height: 36,
  },
  contactButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E8EEF7",
    alignItems: "center",
    justifyContent: "center",
  },
  routeRow: {
    flexDirection: "row",
    gap: 11,
  },
  routeRail: {
    alignItems: "center",
    paddingVertical: 5,
  },
  routeStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F5B51B",
  },
  routeLine: {
    width: 1,
    height: 26,
    backgroundColor: "#CFD6E0",
  },
  routeEnd: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#1C8B59",
  },
  routeLabels: {
    flex: 1,
    gap: 2,
  },
  routeTitle: {
    color: "#344054",
    fontSize: 12,
    fontWeight: "800",
  },
  destinationTitle: {
    marginTop: 6,
  },
  routeSubtitle: {
    color: "#98A2B3",
    fontSize: 10,
  },
  paymentInfo: {
    color: "#526176",
    fontSize: 11,
    fontWeight: "700",
  },
  activeActions: {
    flexDirection: "row",
    gap: 9,
  },
  navigationButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#E8EEF7",
  },
  navigationButtonText: {
    color: "#173B70",
    fontSize: 12,
    fontWeight: "900",
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F5B51B",
  },
  primaryButtonText: {
    color: "#173B70",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  vehicleText: {
    color: "#173B70",
    fontSize: 12,
    fontWeight: "800",
  },
  historySection: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
  },
  historyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E7F5ED",
    alignItems: "center",
    justifyContent: "center",
  },
  historyRoute: {
    color: "#344054",
    fontSize: 11,
    fontWeight: "800",
  },
  historyPrice: {
    color: "#173B70",
    fontSize: 11,
    fontWeight: "900",
  },
  inlineError: {
    color: "#C62828",
    fontSize: 12,
    lineHeight: 18,
  },
  logoutButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  logoutText: {
    color: "#173B70",
    fontSize: 13,
    fontWeight: "800",
  },
});
