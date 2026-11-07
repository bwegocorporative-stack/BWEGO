
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { API_URL } from "../config/api";
import { guardarSessao } from "../services/authSession";

export default function LoginScreen() {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [loading, setLoading] = useState(false);

  const entrar = async () => {
    if (!identificador.trim() || !password) {
      Alert.alert(
        "Campos obrigatórios",
        "Preenche o telefone/email e a palavra-passe."
      );
      return;
    }

    try {
      setLoading(true);

      const resposta = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identificador: identificador.trim(),
          senha: password,
        }),
      });
      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
            resultado.message ||
            "Não foi possível iniciar sessão."
        );
      }

      const tipo = resultado.usuario?.tipo;
      if (!resultado.token || !["cliente", "motorista", "admin"].includes(tipo)) {
        throw new Error("Esta conta não tem acesso disponível nesta aplicação.");
      }

      await guardarSessao(resultado.token, resultado.usuario, lembrar);
      router.replace(
        tipo === "admin"
          ? "/admin"
          : tipo === "motorista"
            ? "/motorista"
            : "/tabs"
      );
    } catch (error) {
      Alert.alert(
        "Erro ao iniciar sessão",
        error.message || "Não foi possível ligar ao servidor. Tenta novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#173B70" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="car-sport" size={27} color="#173B70" />
            </View>

            <Text style={styles.logo}>
              <Text style={styles.logoAzul}>BWÉ</Text>
              <Text style={styles.logoAmarelo}>-GO</Text>
            </Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.welcome}>Bem-vindo de volta!</Text>
            <Text style={styles.headerSubtitle}>
              A tua mobilidade começa aqui.
            </Text>
          </View>

          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />
        </View>

        {/* FORMULÁRIO */}
        <View style={styles.formContainer}>
          <View style={styles.formHeading}>
            <Text style={styles.title}>Iniciar sessão</Text>
            <Text style={styles.subtitle}>
              Clientes, motoristas e administradores podem iniciar sessão aqui.
            </Text>
          </View>

          {/* TELEFONE / EMAIL */}
          <Text style={styles.label}>Telefone ou email</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={21} color="#173B70" />

            <TextInput
              style={styles.input}
              placeholder="Ex: 923 000 000"
              placeholderTextColor="#A0A7B2"
              value={identificador}
              onChangeText={setIdentificador}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          {/* PALAVRA-PASSE */}
          <View style={styles.passwordLabelRow}>
            <Text style={styles.label}>Palavra-passe</Text>

            <TouchableOpacity
              onPress={() => router.push("/recuperar-conta-cliente")}
            >
              <Text style={styles.forgotText}>Esqueceste-te?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={21} color="#173B70" />

            <TextInput
              style={styles.input}
              placeholder="Introduz a tua palavra-passe"
              placeholderTextColor="#A0A7B2"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!mostrarPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() => setMostrarPassword(!mostrarPassword)}
            >
              <Ionicons
                name={mostrarPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#7D8795"
              />
            </TouchableOpacity>
          </View>

          {/* MANTER SESSÃO */}
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setLembrar(!lembrar)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, lembrar && styles.checkboxActive]}>
              {lembrar && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>

            <Text style={styles.rememberText}>
              Manter sessão iniciada
            </Text>
          </TouchableOpacity>

          {/* BOTÃO LOGIN */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={entrar}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "A iniciar sessão..." : "Entrar na conta"}
            </Text>

            {!loading && (
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#173B70"
              />
            )}
          </TouchableOpacity>

          {/* DIVISOR */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.divider} />
          </View>

          {/* REGISTO */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Ainda não tens uma conta?
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/register")}
            >
              <Text style={styles.registerLink}>
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEGURANÇA */}
          <View style={styles.securityInfo}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#1C8B59"
            />

            <Text style={styles.securityText}>
              Os teus dados estão protegidos.
            </Text>
          </View>
        </View>

        {/* RODAPÉ */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            BWÉ-GO · Mobilidade e logística em Angola
          </Text>

          <Text style={styles.version}>
            Versão 1.0
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    backgroundColor: "#173B70",
    minHeight: 285,
    paddingTop: Platform.OS === "ios" ? 60 : 45,
    paddingHorizontal: 25,
    paddingBottom: 45,
    overflow: "hidden",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -38,
  },

  logoIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  logo: {
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 1,
  },

  logoAzul: {
    color: "#FFFFFF",
  },

  logoAmarelo: {
    color: "#F5B51B",
  },

  headerText: {
    marginTop: 43,
  },

  welcome: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#D9E5F5",
    fontSize: 15,
    marginTop: 9,
  },

  decorCircleOne: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 25,
    borderColor: "rgba(255,255,255,0.05)",
    right: -55,
    top: 70,
  },

  decorCircleTwo: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(245,181,27,0.10)",
    right: 45,
    bottom: -45,
  },

  formContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    marginTop: -28,
    borderRadius: 25,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 25,
    elevation: 5,
    shadowColor: "#173B70",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  formHeading: {
    marginBottom: 27,
  },

  title: {
    color: "#173B70",
    fontSize: 23,
    fontWeight: "900",
  },

  subtitle: {
    color: "#8A93A1",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  label: {
    color: "#25364D",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },

  inputContainer: {
    height: 58,
    borderWidth: 1,
    borderColor: "#E5EAF1",
    borderRadius: 14,
    backgroundColor: "#FAFBFD",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 22,
  },

  input: {
    flex: 1,
    height: "100%",
    marginLeft: 12,
    color: "#173B70",
    fontSize: 14,
  },

  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  forgotText: {
    color: "#D99B08",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -5,
    marginBottom: 24,
  },

  checkbox: {
    width: 19,
    height: 19,
    borderWidth: 1.5,
    borderColor: "#C7CFD9",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxActive: {
    backgroundColor: "#173B70",
    borderColor: "#173B70",
  },

  rememberText: {
    color: "#687386",
    fontSize: 12,
    marginLeft: 9,
  },

  loginButton: {
    height: 58,
    backgroundColor: "#F5B51B",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loginButtonText: {
    color: "#173B70",
    fontSize: 16,
    fontWeight: "900",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 26,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E9EDF2",
  },

  dividerText: {
    color: "#A1A9B5",
    fontSize: 11,
    fontWeight: "700",
    marginHorizontal: 15,
  },

  registerContainer: {
    alignItems: "center",
    gap: 8,
  },

  registerText: {
    color: "#8490A0",
    fontSize: 13,
  },

  registerLink: {
    color: "#173B70",
    fontSize: 15,
    fontWeight: "900",
  },

  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 27,
    gap: 7,
  },

  securityText: {
    color: "#8490A0",
    fontSize: 11,
  },

  footer: {
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 15,
  },

  footerText: {
    color: "#8993A2",
    fontSize: 11,
    textAlign: "center",
  },

  version: {
    color: "#B0B8C3",
    fontSize: 10,
    marginTop: 5,
  },
});
