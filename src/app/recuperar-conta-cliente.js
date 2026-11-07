
import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

function Campo({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  rightIcon,
  onRightPress,
  maxLength,
  autoCapitalize = 'none',
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color="#173B70" />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#A0A7B2"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />

        {rightIcon && (
          <TouchableOpacity onPress={onRightPress}>
            <Ionicons name={rightIcon} size={21} color="#7D8795" />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

function IndicadorEtapas({ etapa }) {
  return (
    <View style={styles.stepsContainer}>
      {[1, 2, 3].map((item, index) => (
        <React.Fragment key={item}>
          <View
            style={[
              styles.stepCircle,
              etapa >= item && styles.stepCircleActive,
            ]}
          >
            {etapa > item ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  etapa >= item && styles.stepNumberActive,
                ]}
              >
                {item}
              </Text>
            )}
          </View>

          {index !== 2 && (
            <View
              style={[
                styles.stepLine,
                etapa > item && styles.stepLineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function RecuperarContaScreen() {
  const [etapa, setEtapa] = useState(1);

  const [identificador, setIdentificador] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);

  // ETAPA 1: SOLICITAR CÓDIGO
  const solicitarCodigo = async () => {
    if (!identificador.trim()) {
      Alert.alert(
        'Campo obrigatório',
        'Introduz o teu email ou número de telefone.'
      );
      return;
    }

    const valor = identificador.trim();

    const pareceEmail = valor.includes('@');

    if (pareceEmail) {
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

      if (!emailValido) {
        Alert.alert('Email inválido', 'Introduz um email válido.');
        return;
      }
    } else if (valor.replace(/\D/g, '').length < 9) {
      Alert.alert(
        'Telefone inválido',
        'Introduz um número de telefone válido.'
      );
      return;
    }

    try {
      setLoading(true);

      // FUTURA INTEGRAÇÃO:
      // Enviar pedido de recuperação ao backend.
      // O backend deverá enviar um código OTP por email ou SMS.

      Alert.alert(
        'Pedido preparado',
        'A interface está validada. Liga esta etapa ao backend para enviar o código de recuperação.',
        [
          {
            text: 'Continuar demonstração',
            onPress: () => setEtapa(2),
          },
        ]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível solicitar o código.');
    } finally {
      setLoading(false);
    }
  };

  // ETAPA 2: VALIDAR CÓDIGO
  const validarCodigo = async () => {
    if (codigo.trim().length !== 6) {
      Alert.alert(
        'Código inválido',
        'Introduz o código de verificação de 6 dígitos.'
      );
      return;
    }

    try {
      setLoading(true);

      // FUTURA INTEGRAÇÃO:
      // Enviar o código ao backend para validação.
      // Nunca validar OTP apenas no frontend.

      Alert.alert(
        'Demonstração',
        'A validação real do código será feita pelo backend.',
        [
          {
            text: 'Continuar demonstração',
            onPress: () => setEtapa(3),
          },
        ]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível validar o código.');
    } finally {
      setLoading(false);
    }
  };

  // ETAPA 3: DEFINIR NOVA PALAVRA-PASSE
  const redefinirPassword = async () => {
    if (!novaPassword || !confirmarPassword) {
      Alert.alert(
        'Campos obrigatórios',
        'Preenche os dois campos de palavra-passe.'
      );
      return;
    }

    if (novaPassword.length < 8) {
      Alert.alert(
        'Palavra-passe fraca',
        'A nova palavra-passe deve ter pelo menos 8 caracteres.'
      );
      return;
    }

    if (novaPassword !== confirmarPassword) {
      Alert.alert(
        'Palavras-passe diferentes',
        'As palavras-passe não coincidem.'
      );
      return;
    }

    try {
      setLoading(true);

      // FUTURA INTEGRAÇÃO:
      // Enviar o token de recuperação e a nova palavra-passe
      // ao backend. O backend deverá validar o token,
      // actualizar a palavra-passe com bcrypt e invalidar o token.

      Alert.alert(
        'Demonstração concluída',
        'A interface está pronta. Liga a redefinição ao backend para actualizar a tua palavra-passe.',
        [
          {
            text: 'Ir para login',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível actualizar a palavra-passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#173B70"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >

        {/* CABEÇALHO */}
        <View style={styles.header}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (etapa > 1) {
                setEtapa(etapa - 1);
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons
                name="car-sport"
                size={27}
                color="#173B70"
              />
            </View>

            <Text style={styles.logo}>
              <Text style={styles.logoAzul}>BWÉ</Text>
              <Text style={styles.logoAmarelo}>-GO</Text>
            </Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.welcome}>
              Recupera a tua conta!
            </Text>

            <Text style={styles.headerSubtitle}>
              Estamos aqui para te ajudar a recuperar o acesso.
            </Text>
          </View>

          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />

        </View>

        {/* FORMULÁRIO */}
        <View style={styles.formContainer}>

          <View style={styles.formHeading}>
            <Text style={styles.title}>
              {etapa === 1
                ? 'Recuperar conta'
                : etapa === 2
                ? 'Verificar identidade'
                : 'Nova palavra-passe'}
            </Text>

            <Text style={styles.subtitle}>
              {etapa === 1
                ? 'Introduz o email ou telefone associado à tua conta Bwé-Go.'
                : etapa === 2
                ? 'Introduz o código de verificação de 6 dígitos enviado para ti.'
                : 'Escolhe uma nova palavra-passe para proteger a tua conta.'}
            </Text>
          </View>

          <IndicadorEtapas etapa={etapa} />

          {/* ETAPA 1 */}
          {etapa === 1 && (
            <>
              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={21}
                  color="#173B70"
                />

                <Text style={styles.infoText}>
                  Vamos utilizar os dados associados à tua conta para
                  iniciar a recuperação.
                </Text>
              </View>

              <Campo
                label="Email ou número de telefone"
                placeholder="Ex: joao@email.com"
                icon="person-outline"
                value={identificador}
                onChangeText={setIdentificador}
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={styles.mainButton}
                onPress={solicitarCodigo}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.mainButtonText}>
                  {loading ? 'A processar...' : 'Enviar código'}
                </Text>

                {!loading && (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#173B70"
                  />
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ETAPA 2 */}
          {etapa === 2 && (
            <>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="mail-open-outline"
                  size={38}
                  color="#173B70"
                />
              </View>

              <Text style={styles.codeDescription}>
                Introduz o código que foi enviado para:
              </Text>

              <Text style={styles.destination}>
                {identificador}
              </Text>

              <Campo
                label="Código de verificação"
                placeholder="000000"
                icon="keypad-outline"
                value={codigo}
                onChangeText={(value) =>
                  setCodigo(value.replace(/\D/g, '').slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={styles.mainButton}
                onPress={validarCodigo}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.mainButtonText}>
                  {loading ? 'A verificar...' : 'Verificar código'}
                </Text>

                {!loading && (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#173B70"
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => {
                  Alert.alert(
                    'Reenviar código',
                    'O reenvio deverá ser implementado no backend.'
                  );
                }}
              >
                <Text style={styles.resendText}>
                  Não recebeste o código? Reenviar
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ETAPA 3 */}
          {etapa === 3 && (
            <>
              <View style={styles.infoBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color="#1C8B59"
                />

                <Text style={styles.infoText}>
                  Cria uma palavra-passe segura e diferente da anterior.
                </Text>
              </View>

              <Campo
                label="Nova palavra-passe"
                placeholder="Introduz a nova palavra-passe"
                icon="lock-closed-outline"
                value={novaPassword}
                onChangeText={setNovaPassword}
                secureTextEntry={!mostrarPassword}
                rightIcon={
                  mostrarPassword ? 'eye-off-outline' : 'eye-outline'
                }
                onRightPress={() =>
                  setMostrarPassword(!mostrarPassword)
                }
              />

              <Text style={styles.passwordHint}>
                Utiliza pelo menos 8 caracteres.
              </Text>

              <Campo
                label="Confirmar palavra-passe"
                placeholder="Repete a nova palavra-passe"
                icon="shield-checkmark-outline"
                value={confirmarPassword}
                onChangeText={setConfirmarPassword}
                secureTextEntry={!mostrarConfirmar}
                rightIcon={
                  mostrarConfirmar ? 'eye-off-outline' : 'eye-outline'
                }
                onRightPress={() =>
                  setMostrarConfirmar(!mostrarConfirmar)
                }
              />

              {confirmarPassword.length > 0 && (
                <View style={styles.validationRow}>
                  <Ionicons
                    name={
                      novaPassword === confirmarPassword
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={16}
                    color={
                      novaPassword === confirmarPassword
                        ? '#1C9B62'
                        : '#E05252'
                    }
                  />

                  <Text
                    style={[
                      styles.validationText,
                      {
                        color:
                          novaPassword === confirmarPassword
                            ? '#1C9B62'
                            : '#E05252',
                      },
                    ]}
                  >
                    {novaPassword === confirmarPassword
                      ? 'As palavras-passe coincidem'
                      : 'As palavras-passe não coincidem'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.mainButton}
                onPress={redefinirPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.mainButtonText}>
                  {loading ? 'A actualizar...' : 'Actualizar palavra-passe'}
                </Text>

                {!loading && (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#173B70"
                  />
                )}
              </TouchableOpacity>
            </>
          )}

          {/* VOLTAR AO LOGIN */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>PRECISAS DE AJUDA?</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.loginContainer}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginText}>
              Lembraste-te da palavra-passe?
            </Text>

            <Text style={styles.loginLink}>
              Iniciar sessão
            </Text>
          </TouchableOpacity>

          <View style={styles.securityInfo}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#1C8B59"
            />

            <Text style={styles.securityText}>
              A segurança da tua conta é a nossa prioridade.
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

// ESTILOS
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  scrollContent: {
    flexGrow: 1,
  },

  // CABEÇALHO
  header: {
    backgroundColor: '#173B70',
    minHeight: 285,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingHorizontal: 25,
    paddingBottom: 45,
    overflow: 'hidden',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -38,
  },

  logoIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },

  logo: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 1,
  },

  logoAzul: {
    color: '#FFFFFF',
  },

  logoAmarelo: {
    color: '#F5B51B',
  },

  headerText: {
    marginTop: 43,
  },

  welcome: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },

  headerSubtitle: {
    color: '#D9E5F5',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 300,
  },

  decorCircleOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 25,
    borderColor: 'rgba(255,255,255,0.05)',
    right: -55,
    top: 70,
  },

  decorCircleTwo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245,181,27,0.10)',
    right: 45,
    bottom: -45,
  },

  // FORMULÁRIO
  formContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginTop: -28,
    borderRadius: 25,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 25,
    elevation: 5,
    shadowColor: '#173B70',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  formHeading: {
    marginBottom: 25,
  },

  title: {
    color: '#173B70',
    fontSize: 23,
    fontWeight: '900',
  },

  subtitle: {
    color: '#8A93A1',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  // ETAPAS
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },

  stepCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D9E0E9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepCircleActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },

  stepNumber: {
    color: '#929CAB',
    fontWeight: '800',
    fontSize: 12,
  },

  stepNumberActive: {
    color: '#FFFFFF',
  },

  stepLine: {
    width: 48,
    height: 3,
    backgroundColor: '#E5EAF1',
    marginHorizontal: 8,
  },

  stepLineActive: {
    backgroundColor: '#F5B51B',
  },

  // CAMPOS
  label: {
    color: '#25364D',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },

  inputContainer: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E5EAF1',
    borderRadius: 14,
    backgroundColor: '#FAFBFD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 20,
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    color: '#173B70',
    fontSize: 14,
  },

  // INFORMAÇÕES
  infoBox: {
    backgroundColor: '#F0F5FC',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 25,
  },

  infoText: {
    flex: 1,
    color: '#52647D',
    fontSize: 12,
    lineHeight: 19,
  },

  iconCircle: {
    width: 75,
    height: 75,
    borderRadius: 23,
    backgroundColor: '#FFF4D8',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },

  codeDescription: {
    textAlign: 'center',
    color: '#8490A0',
    fontSize: 13,
    marginBottom: 6,
  },

  destination: {
    textAlign: 'center',
    color: '#173B70',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 25,
  },

  passwordHint: {
    color: '#9AA3B0',
    fontSize: 11,
    marginTop: -12,
    marginBottom: 17,
  },

  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 20,
    gap: 6,
  },

  validationText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // BOTÃO PRINCIPAL
  mainButton: {
    height: 58,
    backgroundColor: '#F5B51B',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 5,
  },

  mainButtonText: {
    color: '#173B70',
    fontSize: 15,
    fontWeight: '900',
  },

  resendButton: {
    alignItems: 'center',
    marginTop: 20,
  },

  resendText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
  },

  // DIVISOR
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 26,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9EDF2',
  },

  dividerText: {
    color: '#A1A9B5',
    fontSize: 10,
    fontWeight: '700',
    marginHorizontal: 13,
  },

  // LOGIN
  loginContainer: {
    alignItems: 'center',
    gap: 8,
  },

  loginText: {
    color: '#8490A0',
    fontSize: 13,
  },

  loginLink: {
    color: '#173B70',
    fontSize: 15,
    fontWeight: '900',
  },

  // SEGURANÇA
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 27,
    gap: 7,
  },

  securityText: {
    color: '#8490A0',
    fontSize: 11,
    textAlign: 'center',
    flexShrink: 1,
  },

  // RODAPÉ
  footer: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 15,
  },

  footerText: {
    color: '#8993A2',
    fontSize: 11,
    textAlign: 'center',
  },

  version: {
    color: '#B0B8C3',
    fontSize: 10,
    marginTop: 5,
  },

});
