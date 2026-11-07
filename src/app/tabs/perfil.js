import { useCallback, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  carregarPerfilUsuario,
  obterUsuario,
  atualizarPerfilUsuario,
  alterarPalavraPasse,
  atualizarFotoPerfil,
  prepararSessaoParaGaleria,
  limparSessaoTemporariaGaleria,
  terminarSessao as limparSessao,
} from "../../services/authSession";

const contarBytesUtf8 = (valor) =>
  Array.from(valor).reduce((total, caractere) => {
    const codigo = caractere.codePointAt(0);
    return total + (codigo <= 0x7f ? 1 : codigo <= 0x7ff ? 2 : codigo <= 0xffff ? 3 : 4);
  }, 0);

export default function Perfil() {
  const [usuario, setUsuario] = useState(null);
  const [editarVisivel, setEditarVisivel] = useState(false);
  const [guardarAlteracoes, setGuardarAlteracoes] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [segurancaVisivel, setSegurancaVisivel] = useState(false);
  const [guardarPalavraPasse, setGuardarPalavraPasse] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [sobreVisivel, setSobreVisivel] = useState(false);

  const enviarFotoSelecionada = useCallback(async (foto) => {
    if (!foto?.uri) {
      Alert.alert("Imagem inválida", "Não foi possível ler a imagem selecionada.");
      return;
    }

    try {
      setEnviandoFoto(true);

      const atualizado = await atualizarFotoPerfil(foto);
      setUsuario(atualizado);
      Alert.alert("Foto atualizada", "A tua foto de perfil foi atualizada.");
    } catch (error) {
      Alert.alert(
        "Não foi possível atualizar a foto",
        error.message || "Tenta novamente."
      );
    } finally {
      setEnviandoFoto(false);
    }
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
      return () => { ativo = false; };
    }, [])
  );

  const opcoes = [
    {
      titulo: "Dados pessoais",
      descricao: "Nome, telefone e email",
      icon: "person-outline",
      pagina: "dados-pessoais",
    },
    {
      titulo: "Carteira",
      descricao: "Consultar saldo e pagamentos",
      icon: "card-outline",
      pagina: "/tabs/carteira",
    },
    {
      titulo: "Segurança e privacidade",
      descricao: "Alterar a palavra-passe",
      icon: "shield-checkmark-outline",
      pagina: "seguranca",
    },
    {
      titulo: "As minhas viagens",
      descricao: "Pedir uma viagem ou consultar o histórico",
      icon: "car-outline",
      pagina: "/tabs/viagens",
    },
    {
      titulo: "Os meus pedidos",
      descricao: "Acompanhar encomendas",
      icon: "receipt-outline",
      pagina: "/tabs/pedidos",
    },
    {
      titulo: "Sobre o Bwé-Go",
      descricao: "Informações sobre a aplicação",
      icon: "information-circle-outline",
      pagina: "sobre",
    },
  ];

  const navegar = (pagina) => {
    if (pagina === "dados-pessoais") {
      abrirEdicao();
      return;
    }

    if (pagina === "seguranca") {
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setSegurancaVisivel(true);
      return;
    }

    if (pagina === "sobre") {
      setSobreVisivel(true);
      return;
    }

    router.push(pagina);
  };

  const escolherFoto = async () => {
    try {
      setEnviandoFoto(true);
      await prepararSessaoParaGaleria();
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: Platform.OS !== "android",
        ...(Platform.OS !== "android" ? { aspect: [1, 1] } : {}),
        quality: 0.8,
      });

      if (resultado.canceled) return;

      await enviarFotoSelecionada(resultado.assets?.[0]);
    } catch (error) {
      Alert.alert(
        "Não foi possível abrir as fotografias",
        error.message || "Tenta novamente."
      );
    } finally {
      setEnviandoFoto(false);
      await limparSessaoTemporariaGaleria();
    }
  };

  const abrirEdicao = () => {
    setNome(usuario?.nome || "");
    setTelefone(usuario?.telefone || "");
    setEmail(usuario?.email || "");
    setEditarVisivel(true);
  };

  const salvarPerfil = async () => {
    if (nome.trim().length < 3) {
      Alert.alert("Nome inválido", "O nome deve ter pelo menos 3 caracteres.");
      return;
    }

    if (telefone.trim().replace(/\D/g, "").length < 9) {
      Alert.alert("Telefone inválido", "Introduz um número de telefone válido.");
      return;
    }

    const emailLimpo = email.trim();
    if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      Alert.alert("Email inválido", "Introduz um endereço de email válido.");
      return;
    }

    try {
      setGuardarAlteracoes(true);
      const atualizado = await atualizarPerfilUsuario({
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: emailLimpo,
      });

      if (!atualizado) {
        router.replace("/login");
        return;
      }

      setUsuario(atualizado);
      setEditarVisivel(false);
      Alert.alert("Perfil atualizado", "Os teus dados foram guardados.");
    } catch (error) {
      if (error.status === 401) {
        router.replace("/login");
        return;
      }

      Alert.alert(
        "Não foi possível guardar",
        error.message || "Tenta novamente."
      );
    } finally {
      setGuardarAlteracoes(false);
    }
  };

  const salvarPalavraPasse = async () => {
    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
      Alert.alert("Campos obrigatórios", "Preenche todos os campos.");
      return;
    }

    if (novaSenha.length < 8) {
      Alert.alert(
        "Palavra-passe inválida",
        "A nova palavra-passe deve ter pelo menos 8 caracteres."
      );
      return;
    }

    if (contarBytesUtf8(novaSenha) > 72) {
      Alert.alert(
        "Palavra-passe inválida",
        "A nova palavra-passe não pode ultrapassar 72 bytes."
      );
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      Alert.alert(
        "Palavras-passe diferentes",
        "A nova palavra-passe e a confirmação não coincidem."
      );
      return;
    }

    if (senhaAtual === novaSenha) {
      Alert.alert(
        "Palavra-passe igual",
        "A nova palavra-passe deve ser diferente da atual."
      );
      return;
    }

    try {
      setGuardarPalavraPasse(true);
      const resultado = await alterarPalavraPasse({
        senhaAtual,
        novaSenha,
        confirmarSenha: confirmarNovaSenha,
      });

      if (!resultado) {
        router.replace("/login");
        return;
      }

      setSegurancaVisivel(false);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      Alert.alert(
        "Palavra-passe alterada",
        resultado.mensagem || "A tua palavra-passe foi alterada."
      );
    } catch (error) {
      if (error.status === 401) {
        router.replace("/login");
        return;
      }

      Alert.alert(
        "Não foi possível alterar",
        error.message || "Verifica os dados e tenta novamente."
      );
    } finally {
      setGuardarPalavraPasse(false);
    }
  };

  const fecharSeguranca = () => {
    if (guardarPalavraPasse) return;
    setSegurancaVisivel(false);
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarNovaSenha("");
  };

  const terminarSessao = async () => {
    try {
      await limparSessao();
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível terminar a sessão."
      );
    }
  };

  const confirmarTerminarSessao = () => {
    Alert.alert(
      "Terminar sessão",
      "Tens a certeza de que queres sair da tua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: () => {
            void terminarSessao();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* CABEÇALHO */}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>

        </View>

        {/* PERFIL DO UTILIZADOR */}

        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={escolherFoto}
            disabled={!usuario || enviandoFoto}
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de perfil"
          >
            {usuario?.foto_url ? (
              <Image
                source={{ uri: usuario.foto_url }}
                style={styles.avatarImage}
                accessibilityLabel="Foto de perfil"
              />
            ) : (
              <Text style={styles.avatarText}>
                {(usuario?.nome || "BW")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((parte) => parte[0])
                  .join("")
                  .toUpperCase()}
              </Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons
                name={enviandoFoto ? "hourglass-outline" : "camera-outline"}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {usuario?.nome || "A carregar perfil..."}
            </Text>

            <Text style={styles.userPhone}>{usuario?.telefone || ""}</Text>

            <Text style={styles.userEmail}>{usuario?.email || ""}</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={abrirEdicao}
            disabled={!usuario || guardarAlteracoes}
            accessibilityRole="button"
            accessibilityLabel="Editar dados pessoais"
          >
            <Ionicons name="create-outline" size={21} color="#F5A623" />
          </TouchableOpacity>
        </View>

        <View style={styles.accountTypeCard}>
          <View style={styles.accountTypeIcon}>
            <Ionicons name="person-circle-outline" size={24} color="#173B70" />
          </View>
          <View>
            <Text style={styles.accountTypeLabel}>Tipo de conta</Text>
            <Text style={styles.accountTypeValue}>
              {usuario?.tipo === "motorista" ? "Motorista" : "Cliente"}
            </Text>
          </View>
        </View>

        {/* OPÇÕES DA CONTA */}

        <Text style={styles.sectionTitle}>A minha conta</Text>

        <View style={styles.optionsContainer}>
          {opcoes.map((item) => (
            <TouchableOpacity
              key={item.pagina}
              style={styles.optionItem}
              onPress={() => navegar(item.pagina)}
            >
              <View style={styles.optionIcon}>
                <Ionicons name={item.icon} size={22} color="#F5A623" />
              </View>

              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{item.titulo}</Text>

                <Text style={styles.optionDescription}>{item.descricao}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        {/* TERMINAR SESSÃO */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={confirmarTerminarSessao}
          accessibilityRole="button"
          accessibilityLabel="Terminar sessão"
        >
          <Ionicons name="log-out-outline" size={22} color="#E53935" />

          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Bwé-Go · Versão 1.0.0</Text>
      </ScrollView>

      <Modal
        visible={editarVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setEditarVisivel(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.editModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Editar dados pessoais</Text>
                <Text style={styles.modalSubtitle}>
                  Atualiza os dados da tua conta.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditarVisivel(false)}
                disabled={guardarAlteracoes}
                accessibilityRole="button"
                accessibilityLabel="Fechar edição"
              >
                <Ionicons name="close-circle" size={28} color="#8490A0" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>Nome completo</Text>
              <TextInput
                style={styles.editInput}
                value={nome}
                onChangeText={setNome}
                placeholder="O teu nome"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={150}
              />

              <Text style={styles.inputLabel}>Número de telefone</Text>
              <TextInput
                style={styles.editInput}
                value={telefone}
                onChangeText={setTelefone}
                placeholder="Ex: 923 000 000"
                keyboardType="phone-pad"
                maxLength={25}
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.editInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Ex: nome@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={190}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditarVisivel(false)}
                disabled={guardarAlteracoes}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  guardarAlteracoes && styles.saveButtonDisabled,
                ]}
                onPress={salvarPerfil}
                disabled={guardarAlteracoes}
              >
                <Text style={styles.saveButtonText}>
                  {guardarAlteracoes ? "A guardar..." : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={segurancaVisivel}
        animationType="slide"
        transparent
        onRequestClose={fecharSeguranca}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.editModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Segurança e privacidade</Text>
                <Text style={styles.modalSubtitle}>
                  Altera a palavra-passe da tua conta.
                </Text>
              </View>
              <TouchableOpacity
                onPress={fecharSeguranca}
                disabled={guardarPalavraPasse}
                accessibilityRole="button"
                accessibilityLabel="Fechar segurança e privacidade"
              >
                <Ionicons name="close-circle" size={28} color="#8490A0" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>Palavra-passe atual</Text>
              <TextInput
                style={styles.editInput}
                value={senhaAtual}
                onChangeText={setSenhaAtual}
                placeholder="Introduz a palavra-passe atual"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />

              <Text style={styles.inputLabel}>Nova palavra-passe</Text>
              <TextInput
                style={styles.editInput}
                value={novaSenha}
                onChangeText={setNovaSenha}
                placeholder="Mínimo de 8 caracteres"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />

              <Text style={styles.inputLabel}>Confirmar nova palavra-passe</Text>
              <TextInput
                style={styles.editInput}
                value={confirmarNovaSenha}
                onChangeText={setConfirmarNovaSenha}
                placeholder="Repete a nova palavra-passe"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={fecharSeguranca}
                disabled={guardarPalavraPasse}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  guardarPalavraPasse && styles.saveButtonDisabled,
                ]}
                onPress={salvarPalavraPasse}
                disabled={guardarPalavraPasse}
              >
                <Text style={styles.saveButtonText}>
                  {guardarPalavraPasse ? "A guardar..." : "Alterar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={sobreVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setSobreVisivel(false)}
      >
        <View style={[styles.modalBackdrop, styles.aboutBackdrop]}>
          <View style={styles.aboutModal}>
            <TouchableOpacity
              style={styles.aboutCloseIcon}
              onPress={() => setSobreVisivel(false)}
              accessibilityRole="button"
              accessibilityLabel="Fechar informações sobre o Bwé-Go"
            >
              <Ionicons name="close" size={23} color="#526176" />
            </TouchableOpacity>
            <View style={styles.aboutBrandIcon}>
              <Ionicons name="car-sport" size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.aboutTitle}>BWÉ-GO</Text>
            <Text style={styles.aboutVersion}>Mobilidade e logística · Versão 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              O Bwé-Go é uma aplicação criada para facilitar o dia a dia em
              Angola, reunindo serviços de mobilidade e entregas numa única
              plataforma.
            </Text>

            <View style={styles.aboutServices}>
              <View style={styles.aboutServiceRow}>
                <Ionicons name="car-outline" size={20} color="#173B70" />
                <Text style={styles.aboutServiceText}>Viagens urbanas</Text>
              </View>
              <View style={styles.aboutServiceRow}>
                <Ionicons name="cube-outline" size={20} color="#173B70" />
                <Text style={styles.aboutServiceText}>Entrega de encomendas</Text>
              </View>
              <View style={styles.aboutServiceRow}>
                <Ionicons name="cart-outline" size={20} color="#173B70" />
                <Text style={styles.aboutServiceText}>
                  Acesso a lojas, farmácias e supermercados
                </Text>
              </View>
            </View>

            <View style={styles.aboutContact}>
              <Text style={styles.aboutContactHeading}>Contacto da empresa</Text>
              <View style={styles.aboutServiceRow}>
                <Ionicons name="mail-outline" size={19} color="#173B70" />
                <Text style={styles.aboutServiceText}>bwegocorporative@gmail.com</Text>
              </View>
              <View style={styles.aboutServiceRow}>
                <Ionicons name="call-outline" size={19} color="#173B70" />
                <Text style={styles.aboutServiceText}>+244 942 081 324</Text>
              </View>
            </View>

            <Text style={styles.aboutDeveloper}>
              Desenvolvido por{"\n"}
              <Text style={styles.aboutDeveloperName}>
                EDSSI — Soluções Inteligentes
              </Text>
            </Text>

            <TouchableOpacity
              style={[styles.saveButton, styles.aboutCloseButton]}
              onPress={() => setSobreVisivel(false)}
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#171717",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  avatarContainer: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "#F5A623",
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
  },

  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#173B70",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },

  userInfo: {
    flex: 1,
    marginLeft: 14,
  },

  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#171717",
    marginBottom: 4,
  },

  userPhone: {
    fontSize: 13,
    color: "#666",
    marginBottom: 3,
  },

  userEmail: {
    fontSize: 12,
    color: "#999",
  },

  editButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: "#FFF5E5",
    justifyContent: "center",
    alignItems: "center",
  },

  accountTypeCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  accountTypeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EAF0FA",
    alignItems: "center",
    justifyContent: "center",
  },

  accountTypeLabel: {
    color: "#8490A0",
    fontSize: 12,
  },

  accountTypeValue: {
    marginTop: 3,
    color: "#173B70",
    fontSize: 15,
    fontWeight: "800",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },

  optionsContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 15,
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },

  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFF5E5",
    justifyContent: "center",
    alignItems: "center",
  },

  optionInfo: {
    flex: 1,
    marginLeft: 13,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  optionDescription: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },

  logoutButton: {
    marginHorizontal: 20,
    marginTop: 25,
    padding: 17,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#E53935",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 10,
  },

  version: {
    textAlign: "center",
    color: "#AAAAAA",
    fontSize: 11,
    marginTop: 22,
    marginBottom: 30,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12, 24, 42, 0.48)",
  },

  editModal: {
    maxHeight: "88%",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
  },

  aboutModal: {
    position: "relative",
    margin: 22,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  aboutBackdrop: {
    justifyContent: "center",
  },

  aboutCloseIcon: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  aboutBrandIcon: {
    width: 68,
    height: 68,
    borderRadius: 21,
    backgroundColor: "#173B70",
    alignItems: "center",
    justifyContent: "center",
  },

  aboutTitle: {
    marginTop: 14,
    color: "#173B70",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },

  aboutVersion: {
    marginTop: 5,
    color: "#8490A0",
    fontSize: 12,
    textAlign: "center",
  },

  aboutDescription: {
    marginTop: 20,
    color: "#526176",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  aboutServices: {
    width: "100%",
    marginTop: 20,
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#F7F9FC",
    gap: 14,
  },

  aboutContact: {
    width: "100%",
    marginTop: 16,
    gap: 12,
  },

  aboutContactHeading: {
    marginBottom: 2,
    color: "#173B70",
    fontSize: 13,
    fontWeight: "800",
  },

  aboutDeveloper: {
    marginTop: 18,
    color: "#8490A0",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  aboutDeveloperName: {
    color: "#173B70",
    fontWeight: "800",
  },

  aboutServiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  aboutServiceText: {
    flex: 1,
    color: "#25364D",
    fontSize: 13,
    fontWeight: "600",
  },

  aboutCloseButton: {
    width: "100%",
    marginTop: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  modalTitle: {
    color: "#173B70",
    fontSize: 20,
    fontWeight: "900",
  },

  modalSubtitle: {
    marginTop: 5,
    color: "#8490A0",
    fontSize: 13,
  },

  inputLabel: {
    marginBottom: 8,
    color: "#25364D",
    fontSize: 13,
    fontWeight: "700",
  },

  editInput: {
    height: 52,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    borderRadius: 13,
    backgroundColor: "#FAFBFD",
    color: "#173B70",
    fontSize: 15,
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },

  cancelButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#EEF1F5",
  },

  cancelButtonText: {
    color: "#526176",
    fontSize: 14,
    fontWeight: "800",
  },

  saveButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#F5B51B",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#173B70",
    fontSize: 14,
    fontWeight: "900",
  },
});
