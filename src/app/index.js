
import React, { useEffect, useState } from 'react';

import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

// ==========================================
// SERVIÇOS PRINCIPAIS
// ==========================================

const servicos = [
  {
    titulo: 'Bwé Ride',
    descricao: 'Viagens rápidas e seguras pela cidade.',
    icon: 'car-sport-outline',
    cor: '#FFF2DC',
    categoria: 'Mobilidade',
  },
  {
    titulo: 'Bwé Delivery',
    descricao: 'Envio e entrega de encomendas.',
    icon: 'cube-outline',
    cor: '#E8F5E9',
    categoria: 'Logística',
  },
  {
    titulo: 'Bwé Farma',
    descricao: 'Medicamentos e produtos de farmácia.',
    icon: 'medkit-outline',
    cor: '#FCE8E8',
    categoria: 'Saúde',
  },
  {
    titulo: 'Bwé Market',
    descricao: 'Compras de supermercados à distância.',
    icon: 'cart-outline',
    cor: '#E8EEFF',
    categoria: 'Compras',
  },
];

// ==========================================
// MODALIDADES DE TRANSPORTE
// ==========================================

const transportes = [
  {
    titulo: 'Bwé Moto',
    descricao: 'Mototáxi para deslocações rápidas.',
    icon: 'bicycle-outline',
    cor: '#FFF2DC',
  },
  {
    titulo: 'Bwé Bike',
    descricao: 'Bicicletas eléctricas.',
    icon: 'bicycle',
    cor: '#E8F5E9',
  },
  {
    titulo: 'Bwé Scooter',
    descricao: 'Trotinetas eléctricas.',
    icon: 'flash-outline',
    cor: '#F1EAFE',
  },
  {
    titulo: 'Bwé Comfort',
    descricao: 'Viaturas ligeiras até 5 lugares.',
    icon: 'car-outline',
    cor: '#E8EEFF',
  },
  {
    titulo: 'Bwé Família',
    descricao: 'Viaturas espaçosas até 8 lugares.',
    icon: 'people-outline',
    cor: '#FCE8E8',
  },
  {
    titulo: 'Bwé VIP',
    descricao: 'Transporte executivo e exclusivo.',
    icon: 'diamond-outline',
    cor: '#FFF5D9',
  },
];

// ==========================================
// PROVÍNCIAS
// ==========================================

const provincias = [
  {
    nome: 'Luanda',
    descricao: 'Mobilidade urbana e entregas.',
    icon: 'business-outline',
  },
  {
    nome: 'Lubango',
    descricao: 'Conectividade e serviços regionais.',
    icon: 'location-outline',
  },
  {
    nome: 'Moxico',
    descricao: 'Expansão e inclusão logística.',
    icon: 'map-outline',
  },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function IndexScreen() {
  const [localizacao, setLocalizacao] = useState({
    provincia: '',
    municipio: '',
    pais: '',
  });

  const [carregandoLocalizacao, setCarregandoLocalizacao] =
    useState(true);

  const [erroLocalizacao, setErroLocalizacao] = useState(false);

  // ========================================
  // NAVEGAÇÃO
  // ========================================

  const irParaLogin = () => {
    router.push('/login');
  };

  const irParaRegisto = () => {
    router.push('/register');
  };

  // ========================================
  // OBTER LOCALIZAÇÃO REAL
  // ========================================

  const obterLocalizacao = async () => {
    try {
      setCarregandoLocalizacao(true);
      setErroLocalizacao(false);

      // Solicitar autorização ao utilizador
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErroLocalizacao(true);
        setLocalizacao({
          provincia: '',
          municipio: '',
          pais: '',
        });
        return;
      }

      // Obter coordenadas GPS
      const coordenadas = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Converter coordenadas em endereço
      const resultado = await Location.reverseGeocodeAsync({
        latitude: coordenadas.coords.latitude,
        longitude: coordenadas.coords.longitude,
      });

      if (resultado.length > 0) {
        const endereco = resultado[0];

        setLocalizacao({
          provincia:
            endereco.region ||
            endereco.subregion ||
            'Não identificada',

          municipio:
            endereco.subregion ||
            endereco.city ||
            endereco.district ||
            'Não identificado',

          pais:
            endereco.country ||
            'Não identificado',
        });
      } else {
        setErroLocalizacao(true);
      }
    } catch (error) {
      console.log('Erro ao obter localização:', error);

      setErroLocalizacao(true);
    } finally {
      setCarregandoLocalizacao(false);
    }
  };

  useEffect(() => {
    // A localização depende de uma autorização do dispositivo e de uma chamada assíncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    obterLocalizacao();
  }, []);

  // ========================================
  // APRESENTAÇÃO
  // ========================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="#FFFFFF"
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CABEÇALHO */}

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons
                name="car-sport"
                size={27}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.logoText}>
              <Text style={styles.logoAzul}>BWÉ</Text>
              <Text style={styles.logoAmarelo}>-GO</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerLogin}
            onPress={irParaLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.headerLoginText}>
              Entrar
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOCALIZAÇÃO ACTUAL */}

        <TouchableOpacity
          style={styles.locationCard}
          onPress={obterLocalizacao}
          activeOpacity={0.8}
        >
          <View style={styles.locationIcon}>
            <Ionicons
              name="location"
              size={23}
              color="#173B70"
            />
          </View>

          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>
              A tua localização actual
            </Text>

            {carregandoLocalizacao ? (
              <View style={styles.loadingLocation}>
                <ActivityIndicator
                  size="small"
                  color="#173B70"
                />

                <Text style={styles.locationText}>
                  A obter localização...
                </Text>
              </View>
            ) : erroLocalizacao ? (
              <Text style={styles.locationError}>
                Não foi possível obter a localização.
                Toca para tentar novamente.
              </Text>
            ) : (
              <>
                <Text style={styles.locationText}>
                  Província: {localizacao.provincia}
                </Text>

                <Text style={styles.locationText}>
                  Município: {localizacao.municipio}
                </Text>

                <Text style={styles.locationText}>
                  País: {localizacao.pais}
                </Text>
              </>
            )}
          </View>

          <Ionicons
            name="refresh-outline"
            size={20}
            color="#8993A2"
          />
        </TouchableOpacity>

        {/* APRESENTAÇÃO */}

        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons
              name="location"
              size={14}
              color="#B8790C"
            />

            <Text style={styles.badgeText}>
              Mobilidade e logística em Angola
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            A tua cidade,{' \n'}
            <Text style={styles.heroHighlight}>
              ao teu alcance.
            </Text>
          </Text>

          <Text style={styles.heroDescription}>
            Viaja, envia encomendas, compra medicamentos
            e recebe as tuas compras com o BWÉ Go.
            Tudo numa única plataforma.
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={irParaLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                Iniciar sessão
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={irParaRegisto}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>

          {/* ILUSTRAÇÃO */}

          <View style={styles.illustration}>
            <View style={styles.circleBackground} />

            <View style={styles.carCircle}>
              <Ionicons
                name="car-sport"
                size={105}
                color="#F5A623"
              />
            </View>

            <View style={styles.deliveryIcon}>
              <Ionicons
                name="bicycle"
                size={30}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.locationIllustrationIcon}>
              <Ionicons
                name="location"
                size={26}
                color="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* SERVIÇOS PRINCIPAIS */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleIndicator} />

            <Text style={styles.sectionTitle}>
              Os nossos serviços
            </Text>
          </View>

          <Text style={styles.sectionDescription}>
            Tudo o que precisas, num único aplicativo.
          </Text>
        </View>

        <View style={styles.servicesGrid}>
          {servicos.map((servico, index) => (
            <View
              key={index}
              style={styles.serviceCard}
            >
              <View
                style={[
                  styles.serviceIcon,
                  { backgroundColor: servico.cor },
                ]}
              >
                <Ionicons
                  name={servico.icon}
                  size={29}
                  color="#173B70"
                />
              </View>

              <Text style={styles.serviceCategory}>
                {servico.categoria}
              </Text>

              <Text style={styles.serviceTitle}>
                {servico.titulo}
              </Text>

              <Text style={styles.serviceDescription}>
                {servico.descricao}
              </Text>
            </View>
          ))}
        </View>

        {/* MODALIDADES DE TRANSPORTE */}

        <View style={styles.transportSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleIndicator} />

              <Text style={styles.sectionTitle}>
                Escolhe como viajar
              </Text>
            </View>

            <Text style={styles.sectionDescription}>
              Diferentes opções de transporte para as tuas necessidades.
            </Text>
          </View>

          <View style={styles.transportGrid}>
            {transportes.map((transporte, index) => (
              <View
                key={index}
                style={styles.transportCard}
              >
                <View
                  style={[
                    styles.transportIcon,
                    { backgroundColor: transporte.cor },
                  ]}
                >
                  <Ionicons
                    name={transporte.icon}
                    size={26}
                    color="#173B70"
                  />
                </View>

                <View style={styles.transportInfo}>
                  <Text style={styles.transportTitle}>
                    {transporte.titulo}
                  </Text>

                  <Text style={styles.transportDescription}>
                    {transporte.descricao}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#B0B7C3"
                />
              </View>
            ))}
          </View>
        </View>

        {/* VANTAGENS */}

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>
            Porque escolher o BWÉ Go?
          </Text>

          <Text style={styles.sectionDescription}>
            Uma plataforma pensada para facilitar o teu dia a dia.
          </Text>

          <Benefit
            icon="shield-checkmark-outline"
            title="Segurança e confiança"
            description="Serviços orientados para uma experiência segura e responsável."
          />

          <Benefit
            icon="time-outline"
            title="Rapidez e conveniência"
            description="Soluções de mobilidade e entregas para poupar tempo."
          />

          <Benefit
            icon="heart-outline"
            title="Apoio à comunidade"
            description="Ligamos pessoas a serviços essenciais, como farmácias e supermercados."
          />
        </View>

        {/* PROVÍNCIAS */}

        <View style={styles.locationSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleIndicator} />

            <Text style={styles.sectionTitle}>
              O BWÉ Go em Angola
            </Text>
          </View>

          <Text style={styles.sectionDescription}>
            O nosso programa-piloto contempla três províncias.
          </Text>

          {provincias.map((provincia, index) => (
            <View
              key={index}
              style={styles.provinceCard}
            >
              <View style={styles.provinceIcon}>
                <Ionicons
                  name={provincia.icon}
                  size={24}
                  color="#173B70"
                />
              </View>

              <View style={styles.provinceInfo}>
                <Text style={styles.provinceName}>
                  {provincia.nome}
                </Text>

                <Text style={styles.provinceDescription}>
                  {provincia.descricao}
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#E4AC13"
              />
            </View>
          ))}
        </View>

        {/* RESPONSABILIDADE */}

        <View style={styles.responsibilityCard}>
          <View style={styles.responsibilityIcon}>
            <Ionicons
              name="leaf-outline"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.responsibilityContent}>
            <Text style={styles.responsibilityTitle}>
              Mobilidade responsável
            </Text>

            <Text style={styles.responsibilityDescription}>
              O BWÉ Go adopta uma política de não transporte e não entrega
              de bebidas alcoólicas, promovendo a segurança e o bem-estar
              da comunidade.
            </Text>
          </View>
        </View>

        {/* PROMOÇÃO */}

        <View style={styles.promotionCard}>
          <View style={styles.promotionContent}>
            <Text style={styles.promotionLabel}>
              BWÉ GO
            </Text>

            <Text style={styles.promotionTitle}>
              A cidade move-se contigo!
            </Text>

            <Text style={styles.promotionDescription}>
              Simplificamos a tua mobilidade e as tuas entregas
              num só aplicativo.
            </Text>

            <TouchableOpacity
              style={styles.promotionButton}
              onPress={irParaRegisto}
              activeOpacity={0.8}
            >
              <Text style={styles.promotionButtonText}>
                Começar agora
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color="#222222"
              />
            </TouchableOpacity>
          </View>

          <Ionicons
            name="navigate-circle"
            size={115}
            color="#FFFFFF"
            style={styles.promotionIcon}
          />
        </View>

        {/* CHAMADA FINAL */}

        <View style={styles.bottomSection}>
          <Text style={styles.bottomTitle}>
            Ainda não tens uma conta?
          </Text>

          <Text style={styles.bottomDescription}>
            Junta-te ao BWÉ Go e aproveita os nossos serviços
            de mobilidade e logística.
          </Text>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={irParaRegisto}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              Registar-se gratuitamente
            </Text>

            <Ionicons
              name="person-add-outline"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomLogin}
            onPress={irParaLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomLoginText}>
              Já tens uma conta?{' '}
              <Text style={styles.bottomLoginHighlight}>
                Fazer login
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* RODAPÉ */}

        <View style={styles.footerContainer}>
          <Text style={styles.footerLogo}>
            BWÉ<Text style={{ color: '#E4AC13' }}>-GO</Text>
          </Text>

          <Text style={styles.footer}>
            Mobilidade e logística em Angola.
          </Text>

          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} BWÉ Go. Todos os direitos reservados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// COMPONENTE DE VANTAGENS
// ==========================================

function Benefit({ icon, title, description }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIcon}>
        <Ionicons
          name={icon}
          size={24}
          color="#173B70"
        />
      </View>

      <View style={styles.benefitInfo}>
        <Text style={styles.benefitTitle}>
          {title}
        </Text>

        <Text style={styles.benefitDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

// ==========================================
// ESTILIZAÇÃO
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#173B70',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 9,
  },

  logoAzul: {
    color: '#173B70',
  },

  logoAmarelo: {
    color: '#E4AC13',
  },

  headerLogin: {
    paddingHorizontal: 19,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4AC13',
  },

  headerLoginText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#173B70',
  },

  // LOCALIZAÇÃO

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 15,
    padding: 14,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E9EDF4',
    gap: 11,
  },

  locationIcon: {
    width: 43,
    height: 43,
    backgroundColor: '#E8EEFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  locationInfo: {
    flex: 1,
  },

  locationTitle: {
    fontSize: 12,
    color: '#8993A2',
    fontWeight: '600',
    marginBottom: 5,
  },

  locationText: {
    fontSize: 12,
    color: '#173B70',
    fontWeight: '700',
    marginTop: 3,
  },

  locationError: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 17,
  },

  loadingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // APRESENTAÇÃO

  hero: {
    marginTop: 5,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  badgeText: {
    color: '#B8790C',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },

  heroTitle: {
    fontSize: 37,
    fontWeight: '900',
    color: '#173B70',
    lineHeight: 45,
    marginTop: 23,
  },

  heroHighlight: {
    color: '#E4AC13',
  },

  heroDescription: {
    fontSize: 14,
    color: '#777777',
    lineHeight: 23,
    marginTop: 13,
  },

  heroButtons: {
    marginTop: 24,
    gap: 12,
  },

  primaryButton: {
    height: 55,
    backgroundColor: '#173B70',
    borderRadius: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  secondaryButton: {
    height: 53,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E4AC13',
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#173B70',
  },

  illustration: {
    height: 230,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },

  circleBackground: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFF3DE',
    position: 'absolute',
  },

  carCircle: {
    width: 165,
    height: 165,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  deliveryIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#173B70',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 35,
    top: 20,
  },

  locationIllustrationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E4AC13',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 35,
    bottom: 15,
  },

  // SECÇÕES

  sectionHeader: {
    marginTop: 15,
    marginBottom: 17,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionTitleIndicator: {
    width: 5,
    height: 23,
    borderRadius: 5,
    backgroundColor: '#E4AC13',
    marginRight: 9,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#173B70',
  },

  sectionDescription: {
    fontSize: 12,
    color: '#999999',
    marginTop: 7,
    lineHeight: 19,
  },

  // SERVIÇOS

  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  serviceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    elevation: 2,
    minHeight: 165,
  },

  serviceIcon: {
    width: 51,
    height: 51,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  serviceCategory: {
    fontSize: 9,
    color: '#B8790C',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  serviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#173B70',
  },

  serviceDescription: {
    fontSize: 10,
    color: '#999999',
    marginTop: 5,
    lineHeight: 15,
  },

  // TRANSPORTES

  transportSection: {
    marginTop: 20,
  },

  transportGrid: {
    gap: 10,
  },

  transportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 12,
    minHeight: 82,
  },

  transportIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  transportInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  transportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#173B70',
  },

  transportDescription: {
    fontSize: 11,
    color: '#999999',
    marginTop: 5,
    lineHeight: 16,
  },

  // VANTAGENS

  benefitsSection: {
    marginTop: 30,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
  },

  benefitIcon: {
    width: 49,
    height: 49,
    borderRadius: 14,
    backgroundColor: '#F0F4FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  benefitInfo: {
    flex: 1,
    marginLeft: 13,
  },

  benefitTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#173B70',
  },

  benefitDescription: {
    fontSize: 11,
    color: '#999999',
    marginTop: 5,
    lineHeight: 17,
  },

  // PROVÍNCIAS

  locationSection: {
    marginTop: 35,
  },

  provinceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    padding: 13,
    borderRadius: 14,
    marginTop: 10,
  },

  provinceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  provinceInfo: {
    flex: 1,
    marginLeft: 12,
  },

  provinceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#173B70',
  },

  provinceDescription: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
  },

  // RESPONSABILIDADE

  responsibilityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#173B70',
    borderRadius: 17,
    padding: 17,
    marginTop: 25,
  },

  responsibilityIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#31588C',
    justifyContent: 'center',
    alignItems: 'center',
  },

  responsibilityContent: {
    flex: 1,
    marginLeft: 12,
  },

  responsibilityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  responsibilityDescription: {
    color: '#DCE5F2',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 7,
  },

  // PROMOÇÃO

  promotionCard: {
    backgroundColor: '#E4AC13',
    borderRadius: 20,
    padding: 20,
    minHeight: 185,
    marginTop: 25,
    overflow: 'hidden',
    justifyContent: 'center',
  },

  promotionContent: {
    width: '78%',
    zIndex: 2,
  },

  promotionLabel: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  promotionTitle: {
    color: '#173B70',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 9,
  },

  promotionDescription: {
    color: '#49340E',
    fontSize: 11,
    marginTop: 8,
    lineHeight: 17,
  },

  promotionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
  },

  promotionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#173B70',
  },

  promotionIcon: {
    position: 'absolute',
    right: -12,
    bottom: 15,
    opacity: 0.25,
  },

  // REGISTO

  bottomSection: {
    alignItems: 'center',
    marginTop: 35,
    padding: 20,
    backgroundColor: '#F7F8FA',
    borderRadius: 18,
  },

  bottomTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#173B70',
    textAlign: 'center',
  },

  bottomDescription: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },

  registerButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#173B70',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },

  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },

  bottomLogin: {
    marginTop: 18,
  },

  bottomLoginText: {
    fontSize: 12,
    color: '#777777',
  },

  bottomLoginHighlight: {
    color: '#D99012',
    fontWeight: 'bold',
  },

  // RODAPÉ

  footerContainer: {
    alignItems: 'center',
    marginTop: 30,
  },

  footerLogo: {
    color: '#173B70',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#888888',
    marginTop: 7,
  },

  footerCopyright: {
    textAlign: 'center',
    fontSize: 9,
    color: '#AAAAAA',
    marginTop: 7,
  },
});
