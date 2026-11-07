import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import {
  carregarPerfilUsuario,
  obterUsuario,
} from "../../services/authSession";

const services = [
  {
    title: "Bwé Ride",
    subtitle: "Solicitar viagem",
    icon: "car-outline",
    color: "#EAF0FA",
    route: "/tabs/viagens",
  },
  {
    title: "Bwé Delivery",
    subtitle: "Enviar encomendas",
    icon: "bicycle-outline",
    color: "#FFF5D9",
    route: "/tabs/pedidos",
  },
  {
    title: "Bwé Farma",
    subtitle: "Produtos de farmácia",
    icon: "medkit-outline",
    color: "#EAF0FA",
    route: "/tabs/pedidos",
  },
  {
    title: "Bwé Market",
    subtitle: "Supermercados",
    icon: "cart-outline",
    color: "#FFF5D9",
    route: "/tabs/pedidos",
  },
];

const transportes = [
  {
    title: "Bwé Moto",
    subtitle: "Mototáxi",
    icon: "bicycle-outline",
  },
  {
    title: "Bwé Bike",
    subtitle: "Bicicleta eléctrica",
    icon: "bicycle",
  },
  {
    title: "Bwé Scooter",
    subtitle: "Trotinetas eléctricas",
    icon: "flash-outline",
  },
  {
    title: "Bwé Comfort",
    subtitle: "Viaturas confortáveis",
    icon: "car-sport-outline",
  },
  {
    title: "Bwé Família",
    subtitle: "Até 8 passageiros",
    icon: "people-outline",
  },
  {
    title: "Bwé VIP",
    subtitle: "Serviço executivo",
    icon: "diamond-outline",
  },
];

export default function HomeScreen() {
  const [usuario, setUsuario] = useState(null);
  const [localizacao, setLocalizacao] = useState({
    provincia: "",
    municipio: "",
    pais: "",
  });

  const [aCarregarLocalizacao, setACarregarLocalizacao] = useState(true);
  const [erroLocalizacao, setErroLocalizacao] = useState("");

  const navegar = (rota) => {
    router.push(rota);
  };

  // =========================================
  // OBTER LOCALIZAÇÃO ACTUAL DO UTILIZADOR
  // =========================================
  const obterLocalizacao = async () => {
    try {
      setACarregarLocalizacao(true);
      setErroLocalizacao("");

      // Solicitar autorização para aceder à localização
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErroLocalizacao(
          "Permissão de localização não concedida."
        );

        Alert.alert(
          "Localização necessária",
          "Permite o acesso à localização para identificarmos a tua província, município e país."
        );

        return;
      }

      // Obter coordenadas actuais
      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = posicao.coords;

      // Converter coordenadas em endereço
      const enderecos = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (!enderecos || enderecos.length === 0) {
        throw new Error("Não foi possível identificar o endereço.");
      }

      const endereco = enderecos[0];

      // Extrair os dados disponibilizados pelo serviço
      const provincia =
        endereco.region ||
        endereco.subregion ||
        "Não identificada";

      const municipio =
        endereco.subregion ||
        endereco.city ||
        endereco.district ||
        "Não identificado";

      const pais =
        endereco.country ||
        "Não identificado";

      setLocalizacao({
        provincia,
        municipio,
        pais,
      });
    } catch (error) {
      console.log("Erro ao obter localização:", error);

      setErroLocalizacao(
        "Não foi possível obter a localização."
      );
    } finally {
      setACarregarLocalizacao(false);
    }
  };

  // Obter localização quando a página abrir
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void obterLocalizacao();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      const carregarUsuario = async () => {
        try {
          const usuarioGuardado = await obterUsuario();
          if (ativo && usuarioGuardado) {
            setUsuario(usuarioGuardado);
          }

          const perfil = await carregarPerfilUsuario();
          if (!ativo) return;

          if (!perfil) {
            router.replace("/login");
            return;
          }

          setUsuario(perfil);
        } catch (error) {
          if (!ativo) return;

          if (error.status === 401) {
            router.replace("/login");
          } else {
            Alert.alert(
              "Perfil indisponível",
              error.message || "Não foi possível carregar os teus dados."
            );
          }
        }
      };

      carregarUsuario();
      return () => {
        ativo = false;
      };
    }, [])
  );

  const primeiroNome = usuario?.nome?.trim().split(/\s+/)[0];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#173B70"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>
                Olá, {primeiroNome || "bem-vindo"} 👋
              </Text>

              <Text style={styles.logo}>
                BWÉ<Text style={styles.logoYellow}>-GO</Text>
              </Text>

              <Text style={styles.headerSubtitle}>
                A tua mobilidade começa aqui.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.notification}
              onPress={() => navegar("/tabs/perfil")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={25}
                color="#173B70"
              />

              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>

          {/* LOCALIZAÇÃO ACTUAL */}
          <TouchableOpacity
            style={styles.location}
            onPress={obterLocalizacao}
            activeOpacity={0.8}
            disabled={aCarregarLocalizacao}
          >
            <View style={styles.locationIcon}>
              <Ionicons
                name="location"
                size={21}
                color="#F5B51B"
              />
            </View>

            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>
                A tua localização actual
              </Text>

              {aCarregarLocalizacao ? (
                <View style={styles.locationLoading}>
                  <ActivityIndicator
                    size="small"
                    color="#F5B51B"
                  />

                  <Text style={styles.locationLoadingText}>
                    A identificar localização...
                  </Text>
                </View>
              ) : erroLocalizacao ? (
                <View>
                  <Text style={styles.locationError}>
                    Localização indisponível
                  </Text>

                  <Text style={styles.locationRetry}>
                    Toca para tentar novamente
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.locationText}>
                    {localizacao.provincia}
                  </Text>

                  <Text style={styles.locationDetails}>
                    {localizacao.municipio}, {localizacao.pais}
                  </Text>
                </View>
              )}
            </View>

            <Ionicons
              name="refresh-outline"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* PESQUISA */}
        <TouchableOpacity
          style={styles.search}
          onPress={() => navegar("/tabs/viagens")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="search"
            size={22}
            color="#173B70"
          />

          <Text style={styles.searchText}>
            Para onde vamos?
          </Text>

          <View style={styles.searchArrow}>
            <Ionicons
              name="arrow-forward"
              size={19}
              color="#173B70"
            />
          </View>
        </TouchableOpacity>

        {/* BANNER */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTag}>
              BWÉ GO
            </Text>

            <Text style={styles.bannerTitle}>
              A cidade move-se contigo!
            </Text>

            <Text style={styles.bannerSubtitle}>
              Viaja, compra e recebe tudo num só lugar.
            </Text>

            <TouchableOpacity
              style={styles.bannerButton}
              onPress={() => navegar("/tabs/viagens")}
            >
              <Text style={styles.bannerButtonText}>
                Pedir uma viagem
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color="#173B70"
              />
            </TouchableOpacity>
          </View>

          <Ionicons
            name="car-sport"
            size={78}
            color="#FFFFFF"
          />
        </View>

        {/* SERVIÇOS PRINCIPAIS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Os nossos serviços
            </Text>

            <Text style={styles.sectionSubtitle}>
              Tudo o que precisas num só lugar.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navegar("/tabs/pedidos")}
          >
            <Text style={styles.seeAll}>
              Ver todos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.services}>
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={styles.serviceCard}
              activeOpacity={0.8}
              onPress={() => navegar(service.route)}
            >
              <View
                style={[
                  styles.serviceIcon,
                  { backgroundColor: service.color },
                ]}
              >
                <Ionicons
                  name={service.icon}
                  size={29}
                  color="#173B70"
                />
              </View>

              <Text style={styles.serviceTitle}>
                {service.title}
              </Text>

              <Text style={styles.serviceSubtitle}>
                {service.subtitle}
              </Text>

              <View style={styles.cardArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color="#173B70"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* MODALIDADES DE TRANSPORTE */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Escolhe a tua viagem
            </Text>

            <Text style={styles.sectionSubtitle}>
              Diferentes opções para cada necessidade.
            </Text>
          </View>
        </View>

        <View style={styles.transportGrid}>
          {transportes.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.transportCard}
              activeOpacity={0.8}
              onPress={() => navegar("/tabs/viagens")}
            >
              <View style={styles.transportIcon}>
                <Ionicons
                  name={item.icon}
                  size={25}
                  color="#173B70"
                />
              </View>

              <View style={styles.transportInfo}>
                <Text style={styles.transportTitle}>
                  {item.title}
                </Text>

                <Text style={styles.transportSubtitle}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#9AA5B5"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* DESTINOS RECENTES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Destinos recentes
          </Text>

          <Ionicons
            name="time-outline"
            size={21}
            color="#173B70"
          />
        </View>

        <TouchableOpacity
          style={styles.destination}
          onPress={() => navegar("/tabs/viagens")}
        >
          <View style={styles.destinationIcon}>
            <Ionicons
              name="location-outline"
              size={23}
              color="#173B70"
            />
          </View>

          <View style={styles.destinationInfo}>
            <Text style={styles.destinationTitle}>
              Talatona
            </Text>

            <Text style={styles.smallText}>
              Luanda, Angola
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9AA5B5"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.destination}
          onPress={() => navegar("/tabs/viagens")}
        >
          <View style={styles.destinationIcon}>
            <Ionicons
              name="location-outline"
              size={23}
              color="#173B70"
            />
          </View>

          <View style={styles.destinationInfo}>
            <Text style={styles.destinationTitle}>
              Maianga
            </Text>

            <Text style={styles.smallText}>
              Luanda, Angola
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9AA5B5"
          />
        </TouchableOpacity>

        {/* SEGURANÇA */}
        <View style={styles.securityBanner}>
          <Ionicons
            name="shield-checkmark"
            size={25}
            color="#173B70"
          />

          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>
              Segurança em primeiro lugar
            </Text>

            <Text style={styles.securityText}>
              A tua segurança e confiança são a nossa prioridade.
            </Text>
          </View>
        </View>

        {/* POLÍTICA DE RESPONSABILIDADE */}
        <View style={styles.policy}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#B47D00"
          />

          <Text style={styles.policyText}>
            O BWÉ Go não permite o transporte ou a entrega de bebidas
            alcoólicas através dos seus serviços.
          </Text>
        </View>

        {/* RODAPÉ */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>
            BWÉ<Text style={styles.logoYellow}>-GO</Text>
          </Text>

          <Text style={styles.footerText}>
            Mobilidade e logística integrada em Angola.
          </Text>

          <Text style={styles.version}>
            Versão 1.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  scrollContent: {
    paddingBottom: 25,
  },

  header: {
    backgroundColor: "#173B70",
    paddingTop: 55,
    paddingHorizontal: 22,
    paddingBottom: 27,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  greeting: {
    fontSize: 13,
    color: "#D9E5F5",
  },

  logo: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginTop: 3,
  },

  logoYellow: {
    color: "#F5B51B",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#D9E5F5",
    marginTop: 3,
  },

  notification: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F5B51B",
    top: 9,
    right: 10,
  },

  // LOCALIZAÇÃO
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 27,
    paddingVertical: 5,
  },

  locationIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#FFFFFF1A",
    justifyContent: "center",
    alignItems: "center",
  },

  locationInfo: {
    flex: 1,
  },

  locationLabel: {
    fontSize: 11,
    color: "#D9E5F5",
    marginBottom: 4,
  },

  locationText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  locationDetails: {
    fontSize: 11,
    color: "#D9E5F5",
    marginTop: 3,
  },

  locationLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  locationLoadingText: {
    fontSize: 12,
    color: "#FFFFFF",
  },

  locationError: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  locationRetry: {
    fontSize: 10,
    color: "#F5B51B",
    marginTop: 3,
  },

  // PESQUISA
  search: {
    height: 59,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginTop: -1,
    elevation: 3,
  },

  searchText: {
    flex: 1,
    color: "#8993A2",
    fontSize: 14,
  },

  searchArrow: {
    width: 34,
    height: 34,
    backgroundColor: "#FFF3D0",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },

  // BANNER
  banner: {
    backgroundColor: "#173B70",
    borderRadius: 21,
    padding: 19,
    marginHorizontal: 20,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  bannerContent: {
    flex: 1,
    paddingRight: 5,
  },

  bannerTag: {
    color: "#F5B51B",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 7,
  },

  bannerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  bannerSubtitle: {
    fontSize: 12,
    color: "#D9E5F5",
    marginTop: 7,
    lineHeight: 18,
  },

  bannerButton: {
    backgroundColor: "#F5B51B",
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  bannerButtonText: {
    fontSize: 11,
    color: "#173B70",
    fontWeight: "900",
  },

  // SECÇÕES
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 29,
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#173B70",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#8993A2",
    marginTop: 5,
  },

  seeAll: {
    color: "#B47D00",
    fontSize: 12,
    fontWeight: "900",
  },

  // SERVIÇOS
  services: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: 20,
    rowGap: 12,
  },

  serviceCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9EDF4",
    minHeight: 155,
    elevation: 2,
  },

  serviceIcon: {
    width: 49,
    height: 49,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 11,
  },

  serviceTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#173B70",
  },

  serviceSubtitle: {
    fontSize: 11,
    color: "#8993A2",
    marginTop: 5,
  },

  cardArrow: {
    position: "absolute",
    right: 13,
    top: 15,
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: "#F5F7FB",
    justifyContent: "center",
    alignItems: "center",
  },

  // TRANSPORTES
  transportGrid: {
    marginHorizontal: 20,
    gap: 10,
  },

  transportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EDF4",
  },

  transportIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#EAF0FA",
    justifyContent: "center",
    alignItems: "center",
  },

  transportInfo: {
    flex: 1,
    marginLeft: 12,
  },

  transportTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#173B70",
  },

  transportSubtitle: {
    fontSize: 11,
    color: "#8993A2",
    marginTop: 4,
  },

  // DESTINOS
  destination: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9EDF4",
    gap: 12,
  },

  destinationIcon: {
    width: 43,
    height: 43,
    backgroundColor: "#EAF0FA",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  destinationInfo: {
    flex: 1,
  },

  destinationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#173B70",
  },

  smallText: {
    fontSize: 11,
    color: "#8993A2",
    marginTop: 4,
  },

  // SEGURANÇA
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF0FA",
    marginHorizontal: 20,
    marginTop: 22,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },

  securityInfo: {
    flex: 1,
  },

  securityTitle: {
    color: "#173B70",
    fontSize: 13,
    fontWeight: "900",
  },

  securityText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  // POLÍTICA
  policy: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF5D9",
    marginHorizontal: 20,
    marginTop: 12,
    padding: 13,
    borderRadius: 13,
    gap: 9,
  },

  policyText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#745719",
  },

  // RODAPÉ
  footer: {
    alignItems: "center",
    paddingVertical: 25,
  },

  footerLogo: {
    color: "#173B70",
    fontSize: 22,
    fontWeight: "900",
  },

  footerText: {
    color: "#8993A2",
    fontSize: 11,
    marginTop: 5,
  },

  version: {
    color: "#B0B8C3",
    fontSize: 10,
    marginTop: 5,
  },
});