import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { API_URL } from "../../config/api";
import { guardarSessao, obterUsuario } from "../../services/authSession";

export default function AdminLoginScreen() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [cadastroDisponivel, setCadastroDisponivel] = useState(false);
  const [cadastroInicialSemSecret, setCadastroInicialSemSecret] = useState(false);
  const [consultandoCadastro, setConsultandoCadastro] = useState(true);
  const [erroConsultaCadastro, setErroConsultaCadastro] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [codigoConfiguracao, setCodigoConfiguracao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const entrar = async () => {
    if (!identificador.trim() || !senha) {
      setErro("Introduz o email ou telefone e a palavra-passe.");
      return;
    }

    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identificador: identificador.trim(),
          senha,
        }),
      });
      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem || "Não foi possível iniciar sessão."
        );
      }

      if (!["admin", "gestor"].includes(resultado.usuario?.tipo) || !resultado.token) {
        throw new Error("Esta página é exclusiva para administradores e gestores.");
      }

      await guardarSessao(resultado.token, resultado.usuario, false);
      router.replace("/admin");
    } catch (error) {
      setErro(error.message || "Não foi possível ligar ao servidor.");
    } finally {
      setCarregando(false);
    }
  };

  const criarPrimeiroAdmin = async () => {
    if (!nome.trim() || !email.trim() || !telefone.trim() || !senha ||
        !confirmarSenha || !codigoConfiguracao) {
      setErro("Preenche todos os campos para criar a conta administrativa.");
      return;
    }
    if (senha.length < 12) {
      setErro("A palavra-passe deve ter pelo menos 12 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As palavras-passe não coincidem.");
      return;
    }

    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(`${API_URL}/auth/admin-setup`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          senha,
          confirmarSenha,
          codigoConfiguracao,
        }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem || "Não foi possível criar o administrador."
        );
      }
      if (resultado.usuario?.tipo !== "admin" || !resultado.token) {
        throw new Error("O servidor não confirmou a criação da conta administrativa.");
      }

      await guardarSessao(resultado.token, resultado.usuario, false);
      router.replace("/admin");
    } catch (error) {
      setErro(error.message || "Não foi possível ligar ao servidor.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let ativo = true;
    const inicializar = async () => {
      try {
        const usuario = await obterUsuario();
        if (ativo && ["admin", "gestor"].includes(usuario?.tipo)) {
          router.replace("/admin");
          return;
        }

        const resposta = await fetch(`${API_URL}/auth/admin-setup/status`, {
          headers: { Accept: "application/json" },
        });
        const resultado = await resposta.json();
        if (!resposta.ok) {
          throw new Error(
            resultado.mensagem || "Não foi possível verificar o cadastro inicial."
          );
        }
        if (ativo) {
          setCadastroDisponivel(resultado.disponivel === true);
          setCadastroInicialSemSecret(
            resultado.administradorExiste !== true &&
              resultado.configurado !== true
          );
        }
      } catch (error) {
        if (ativo) {
          setErroConsultaCadastro(
            error.message || "Não foi possível verificar o cadastro inicial."
          );
        }
      } finally {
        if (ativo) setConsultandoCadastro(false);
      }
    };
    void inicializar();

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" backgroundColor="#102A50" />
      <View style={styles.brandPanel}>
        <View style={styles.brandIcon}>
          <Ionicons name="shield-checkmark" size={34} color="#173B70" />
        </View>
        <Text style={styles.brandTitle}>BWÉ-GO</Text>
        <Text style={styles.brandCaption}>CENTRO DE ADMINISTRAÇÃO</Text>
        <View style={styles.brandRule} />
        <Text style={styles.brandDescription}>
          Gere clientes, motoristas, parceiros e serviços num só lugar.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.formPanel}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Text style={styles.eyebrow}>ÁREA RESTRITA</Text>
            <Text style={styles.title}>
              {modoCadastro
                ? "Criar primeiro administrador"
                : "Entrar como administrador ou gestor"}
            </Text>
            <Text style={styles.subtitle}>
              {modoCadastro
                ? "Este cadastro só é permitido enquanto ainda não existir um administrador."
                : "Usa as credenciais da tua conta de administração ou gestão."}
            </Text>

            {modoCadastro ? (
              <>
                <Text style={styles.label}>Nome completo</Text>
                <View style={styles.input}>
                  <Ionicons name="person-outline" size={20} color="#667085" />
                  <TextInput
                    style={styles.inputText}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Nome do administrador"
                    placeholderTextColor="#98A2B3"
                    autoCapitalize="words"
                    textContentType="name"
                    editable={!carregando}
                  />
                </View>
                <Text style={styles.label}>Email</Text>
                <View style={styles.input}>
                  <Ionicons name="mail-outline" size={20} color="#667085" />
                  <TextInput
                    style={styles.inputText}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="admin@empresa.ao"
                    placeholderTextColor="#98A2B3"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!carregando}
                  />
                </View>
                <Text style={styles.label}>Telefone</Text>
                <View style={styles.input}>
                  <Ionicons name="call-outline" size={20} color="#667085" />
                  <TextInput
                    style={styles.inputText}
                    value={telefone}
                    onChangeText={setTelefone}
                    placeholder="+244 900 000 000"
                    placeholderTextColor="#98A2B3"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    editable={!carregando}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Email ou telefone</Text>
                <View style={styles.input}>
                  <Ionicons name="person-outline" size={20} color="#667085" />
                  <TextInput
                    style={styles.inputText}
                    value={identificador}
                    onChangeText={setIdentificador}
                    placeholder="admin@empresa.ao"
                    placeholderTextColor="#98A2B3"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="username"
                    returnKeyType="next"
                    editable={!carregando}
                    accessibilityLabel="Email ou telefone do administrador"
                  />
                </View>
              </>
            )}

            <Text style={styles.label}>Palavra-passe</Text>
            <View style={styles.input}>
              <Ionicons name="lock-closed-outline" size={20} color="#667085" />
              <TextInput
                style={styles.inputText}
                value={senha}
                onChangeText={setSenha}
                placeholder={
                  modoCadastro
                    ? "Mínimo de 12 caracteres"
                    : "Introduz a tua palavra-passe"
                }
                placeholderTextColor="#98A2B3"
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={modoCadastro ? criarPrimeiroAdmin : entrar}
                editable={!carregando}
                accessibilityLabel="Palavra-passe de administrador"
              />
              <TouchableOpacity
                onPress={() => setMostrarSenha((atual) => !atual)}
                accessibilityRole="button"
                accessibilityLabel={
                  mostrarSenha ? "Ocultar palavra-passe" : "Mostrar palavra-passe"
                }
              >
                <Ionicons
                  name={mostrarSenha ? "eye-off-outline" : "eye-outline"}
                  size={21}
                  color="#667085"
                />
              </TouchableOpacity>
            </View>

            {modoCadastro && (
              <>
                <Text style={styles.label}>Confirmar palavra-passe</Text>
                <View style={styles.input}>
                  <Ionicons name="lock-closed-outline" size={20} color="#667085" />
                  <TextInput
                    style={styles.inputText}
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    placeholder="Repete a palavra-passe"
                    placeholderTextColor="#98A2B3"
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    textContentType="newPassword"
                    editable={!carregando}
                  />
                </View>
                <Text style={styles.label}>Código de configuração</Text>
                <View style={styles.input}>
                  <Ionicons name="key-outline" size={20} color="#667085" />
                  <TextInput
                    style={styles.inputText}
                    value={codigoConfiguracao}
                    onChangeText={setCodigoConfiguracao}
                    placeholder="Código definido no servidor"
                    placeholderTextColor="#98A2B3"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    editable={!carregando}
                    accessibilityLabel="Código de configuração do administrador"
                  />
                </View>
              </>
            )}

            {!!erro && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={19} color="#B42318" />
                <Text style={styles.errorText}>{erro}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, carregando && styles.submitDisabled]}
              onPress={modoCadastro ? criarPrimeiroAdmin : entrar}
              disabled={carregando}
              accessibilityRole="button"
            >
              {carregando ? (
                <ActivityIndicator color="#173B70" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {modoCadastro ? "Criar administrador" : "Entrar no painel"}
                  </Text>
                  <Ionicons name="arrow-forward" size={19} color="#173B70" />
                </>
              )}
            </TouchableOpacity>

            {!modoCadastro && cadastroDisponivel && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setErro("");
                  setModoCadastro(true);
                }}
                disabled={carregando || consultandoCadastro}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>
                  Criar primeiro administrador
                </Text>
              </TouchableOpacity>
            )}

            {modoCadastro && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setErro("");
                  setModoCadastro(false);
                }}
                disabled={carregando}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Voltar ao login</Text>
              </TouchableOpacity>
            )}

            {!!erroConsultaCadastro && !cadastroDisponivel && (
              <Text style={styles.setupStatusError}>{erroConsultaCadastro}</Text>
            )}

            {cadastroInicialSemSecret && !modoCadastro && (
              <View style={styles.setupNotice} accessibilityRole="alert">
                <Ionicons name="information-circle-outline" size={19} color="#B54708" />
                <Text style={styles.setupNoticeText}>
                  Ainda não há administrador, mas o cadastro inicial está bloqueado.
                  Configure ADMIN_SETUP_SECRET no .env do backend e reinicie o servidor
                  para criar a primeira conta com segurança.
                </Text>
              </View>
            )}

            <Text style={styles.securityNote}>
              <Ionicons name="lock-closed" size={12} color="#667085" />
              {"  "}
              {modoCadastro
                ? "O código de configuração protege a criação inicial."
                : "Acesso protegido para contas de administrador."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#F4F6FA",
    flexDirection: Platform.OS === "web" ? "row" : "column",
  },
  brandPanel: {
    flex: Platform.OS === "web" ? 1 : 0,
    minHeight: Platform.OS === "web" ? "100%" : 230,
    backgroundColor: "#173B70",
    paddingHorizontal: 36,
    paddingVertical: 36,
    justifyContent: "center",
    alignItems: Platform.OS === "web" ? "flex-start" : "center",
  },
  brandIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  brandCaption: {
    color: "#F5B91B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 7,
  },
  brandRule: {
    width: 56,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#F5B91B",
    marginTop: 27,
  },
  brandDescription: {
    maxWidth: 360,
    color: "#E8EEF8",
    fontSize: 16,
    lineHeight: 25,
    marginTop: 19,
    textAlign: Platform.OS === "web" ? "left" : "center",
  },
  formPanel: {
    flex: Platform.OS === "web" ? 1 : 1,
    justifyContent: "center",
  },
  formScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  formCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 30,
    ...Platform.select({
      web: { boxShadow: "0 16px 48px rgba(16, 42, 80, 0.10)" },
      default: {
        elevation: 4,
        shadowColor: "#102A50",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
    }),
  },
  eyebrow: {
    color: "#16804A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    color: "#173B70",
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "900",
    marginTop: 10,
  },
  subtitle: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 25,
  },
  label: {
    color: "#344054",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  inputText: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: "#101828",
    fontSize: 14,
    outlineStyle: "none",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 11,
    borderRadius: 10,
    backgroundColor: "#FEF3F2",
  },
  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 52,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#F5B91B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: "#173B70", fontSize: 14, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: "#173B70",
    fontSize: 13,
    fontWeight: "800",
  },
  setupStatusError: {
    color: "#B54708",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    textAlign: "center",
  },
  setupNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    padding: 11,
    borderRadius: 10,
    backgroundColor: "#FFFAEB",
  },
  setupNoticeText: {
    flex: 1,
    color: "#93370D",
    fontSize: 11,
    lineHeight: 17,
  },
  securityNote: {
    color: "#667085",
    fontSize: 11,
    textAlign: "center",
    marginTop: 19,
  },
});
