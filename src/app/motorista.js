import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { API_URL } from "../config/api";
import { obterToken, terminarSessao } from "../services/authSession";
import {
  atualizarDisponibilidadeMotorista,
  atualizarLocalizacaoMotorista,
} from "../services/motoristas";

export default function MotoristaScreen() {
  const [motorista, setMotorista] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [erroLocalizacao, setErroLocalizacao] = useState("");
  const [atualizandoDisponibilidade, setAtualizandoDisponibilidade] =
    useState(false);
  const subscricaoLocalizacao = useRef(null);

  const buscarPerfil = useCallback(async () => {
    const token = await obterToken();
    if (!token) {
      return null;
    }

    const resposta = await fetch(`${API_URL}/motoristas/perfil`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const resultado = await resposta.json();

    if (resposta.status === 401) {
      await terminarSessao();
    }
    if (!resposta.ok) {
      const error = new Error(
        resultado.mensagem || "Não foi possível carregar o perfil."
      );
      error.status = resposta.status;
      throw error;
    }

    return resultado.motorista;
  }, []);

  useEffect(() => {
    if (motorista?.disponibilidade !== "disponivel") {
      return undefined;
    }

    let ativo = true;
    let enviandoLocalizacao = false;
    let intervaloLocalizacao;
    const enviarLocalizacao = async (coordenadas) => {
      if (enviandoLocalizacao) return;
      enviandoLocalizacao = true;
      try {
        const posicao = coordenadas
          ? { coords: coordenadas }
          : await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
        await atualizarLocalizacaoMotorista(
          posicao.coords.latitude,
          posicao.coords.longitude
        );
        if (ativo) setErroLocalizacao("");
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
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error(
          "Permite o acesso à localização para ficares visível aos clientes."
        );
      }

      await enviarLocalizacao();
      const subscricao = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        (posicao) => {
          void enviarLocalizacao(posicao.coords);
        }
      );

      if (ativo) {
        subscricaoLocalizacao.current = subscricao;
        intervaloLocalizacao = setInterval(() => {
          void enviarLocalizacao();
        }, 30000);
      } else {
        subscricao.remove();
      }
    };

    iniciarAtualizacoes().catch(async (error) => {
      if (!ativo) return;
      setErroLocalizacao(
        error.message || "Não foi possível iniciar a localização."
      );
      try {
        await atualizarDisponibilidadeMotorista("offline");
        if (ativo) {
          setMotorista((atual) => ({
            ...atual,
            disponibilidade: "offline",
          }));
        }
      } catch (erroDisponibilidade) {
        if (ativo) {
          setErroLocalizacao(
            `${error.message} ${erroDisponibilidade.message || ""}`.trim()
          );
        }
      }
    });

    return () => {
      ativo = false;
      subscricaoLocalizacao.current?.remove();
      subscricaoLocalizacao.current = null;
      clearInterval(intervaloLocalizacao);
    };
  }, [motorista?.disponibilidade]);

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
        if (error.status === 401) {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [buscarPerfil]);

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
      if (error.status === 401) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const alternarDisponibilidade = async () => {
    if (!motorista) return;
    setAtualizandoDisponibilidade(true);
    setErroLocalizacao("");

    try {
      if (motorista.disponibilidade === "disponivel") {
        await atualizarDisponibilidadeMotorista("offline");
        setMotorista((atual) => ({
          ...atual,
          disponibilidade: "offline",
        }));
        return;
      }

      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error(
          "Permite o acesso à localização para ficares disponível."
        );
      }

      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await atualizarLocalizacaoMotorista(
        posicao.coords.latitude,
        posicao.coords.longitude
      );
      await atualizarDisponibilidadeMotorista("disponivel");
      setMotorista((atual) => ({
        ...atual,
        disponibilidade: "disponivel",
      }));
    } catch (error) {
      setErroLocalizacao(
        error.message || "Não foi possível alterar a disponibilidade."
      );
    } finally {
      setAtualizandoDisponibilidade(false);
    }
  };

  const sair = async () => {
    try {
      await terminarSessao();
      router.replace("/login");
    } catch {
      Alert.alert("Erro", "Não foi possível terminar a sessão.");
    }
  };

  const estado = motorista?.estado_aprovacao || "pendente";
  const aprovado = estado === "aprovado";
  const estadoDescricao = {
    pendente: "Cadastro em análise",
    aprovado: "Conta aprovada",
    rejeitado: "Cadastro não aprovado",
    suspenso: "Conta suspensa",
  }[estado] || "Estado do cadastro";
  const ocupado = motorista?.disponibilidade === "ocupado";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#173B70" />
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="car-sport" size={27} color="#173B70" />
        </View>
        <Text style={styles.brand}>BWÉ-GO MOTORISTA</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#173B70" />
        ) : erro ? (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={42} color="#D99B08" />
            <Text style={styles.title}>Não foi possível carregar o perfil</Text>
            <Text style={styles.description}>{erro}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={carregarPerfil}
            >
              <Text style={styles.primaryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={[styles.statusIcon, aprovado && styles.approvedIcon]}>
              <Ionicons
                name={aprovado ? "checkmark-circle" : "time-outline"}
                size={36}
                color={aprovado ? "#1C8B59" : "#D99B08"}
              />
            </View>
            <Text style={styles.title}>
              {motorista?.nome ? `Olá, ${motorista.nome}` : "Área do motorista"}
            </Text>
            <Text style={styles.status}>
              {estadoDescricao}
            </Text>
            <Text style={styles.description}>
              {estado === "pendente"
                ? "Recebemos os teus dados. A tua conta ficará disponível depois da validação pela equipa Bwé-Go."
                : aprovado
                    ? "Ativa a disponibilidade para clientes próximos te encontrarem. Mantém a aplicação aberta para partilhares a tua localização."
                  : "Contacta a equipa Bwé-Go para obteres mais informações sobre o estado da tua conta."}
            </Text>
            {motorista?.matricula ? (
              <Text style={styles.vehicle}>
                {motorista.marca_veiculo} {motorista.modelo_veiculo} ·{" "}
                {motorista.matricula}
              </Text>
            ) : null}
            {aprovado ? (
              <View style={styles.availabilitySection}>
                <Text style={styles.availabilityStatus}>
                  {ocupado
                    ? "Estás ocupado numa viagem."
                    : motorista.disponibilidade === "disponivel"
                      ? "Estás visível para clientes perto de ti."
                      : "Fica disponível para receber pedidos próximos."}
                </Text>
                {erroLocalizacao ? (
                  <Text style={styles.locationError}>{erroLocalizacao}</Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    motorista.disponibilidade === "disponivel" &&
                      styles.offlineButton,
                  ]}
                  onPress={alternarDisponibilidade}
                  disabled={atualizandoDisponibilidade || ocupado}
                >
                  {atualizandoDisponibilidade ? (
                    <ActivityIndicator color="#173B70" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {ocupado
                        ? "Ocupado"
                        : motorista.disponibilidade === "disponivel"
                          ? "Ficar offline"
                          : "Ficar disponível"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={sair}>
          <Ionicons name="log-out-outline" size={20} color="#173B70" />
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    minHeight: 150,
    backgroundColor: "#173B70",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  card: {
    alignItems: "center",
    padding: 24,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#173B70",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF7E4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  approvedIcon: {
    backgroundColor: "#E8F5EE",
  },
  title: {
    color: "#173B70",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  status: {
    marginTop: 12,
    color: "#D99B08",
    fontSize: 15,
    fontWeight: "800",
  },
  description: {
    marginTop: 10,
    color: "#758195",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  vehicle: {
    marginTop: 16,
    color: "#173B70",
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: "#F5B51B",
  },
  primaryButtonText: {
    color: "#173B70",
    fontSize: 14,
    fontWeight: "900",
  },
  availabilitySection: {
    width: "100%",
    marginTop: 16,
    alignItems: "center",
  },
  availabilityStatus: {
    color: "#526176",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  locationError: {
    marginTop: 8,
    color: "#C62828",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  offlineButton: {
    backgroundColor: "#E8EDF4",
  },
  logoutButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  logoutText: {
    color: "#173B70",
    fontSize: 14,
    fontWeight: "800",
  },
});
