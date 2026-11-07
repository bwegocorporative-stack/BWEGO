
import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { API_URL } from '../config/api';

function Campo({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  rightIcon,
  onRightPress,
  maxLength,
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
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
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

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [foto, setFoto] = useState(null);
  const [tipoConta, setTipoConta] = useState('cliente');
  const [dadosMotorista, setDadosMotorista] = useState({
    numero_carta_conducao: '',
    categoria_carta: '',
    validade_carta: '',
    numero_bi: '',
    data_nascimento: '',
    marca_veiculo: '',
    modelo_veiculo: '',
    matricula: '',
    cor_veiculo: '',
    ano_veiculo: '',
    capacidade_passageiros: '4',
  });

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [aceitarTermos, setAceitarTermos] = useState(false);

  const [loading, setLoading] = useState(false);

  const atualizarDadoMotorista = (campo, valor) => {
    setDadosMotorista((atuais) => ({ ...atuais, [campo]: valor }));
  };

  const escolherFoto = async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!resultado.canceled) {
        setFoto(resultado.assets[0]);
      }
    } catch {
      Alert.alert(
        'Erro',
        'Não foi possível abrir a galeria de imagens.'
      );
    }
  };

  // FUNÇÃO PARA VALIDAR E CRIAR CONTA
  const criarConta = async () => {
    if (
      !nome.trim() ||
      !email.trim() ||
      !telefone.trim() ||
      !password ||
      !confirmarPassword
    ) {
      Alert.alert(
        'Campos obrigatórios',
        'Preenche todos os campos para continuares.'
      );
      return;
    }

    if (
      tipoConta === 'motorista' &&
      [
        dadosMotorista.numero_carta_conducao,
        dadosMotorista.categoria_carta,
        dadosMotorista.validade_carta,
        dadosMotorista.numero_bi,
        dadosMotorista.data_nascimento,
        dadosMotorista.marca_veiculo,
        dadosMotorista.modelo_veiculo,
        dadosMotorista.matricula,
      ].some((valor) => !valor.trim())
    ) {
      Alert.alert(
        'Dados do motorista',
        'Preenche os dados obrigatórios da carta, BI e veículo.'
      );
      return;
    }

    if (nome.trim().length < 3) {
      Alert.alert('Nome inválido', 'Introduz o teu nome completo.');
      return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (!emailValido) {
      Alert.alert('Email inválido', 'Introduz um endereço de email válido.');
      return;
    }

    if (telefone.trim().replace(/\D/g, '').length < 9) {
      Alert.alert(
        'Telefone inválido',
        'Introduz um número de telefone válido.'
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Palavra-passe fraca',
        'A palavra-passe deve ter pelo menos 8 caracteres.'
      );
      return;
    }

    if (password !== confirmarPassword) {
      Alert.alert(
        'Palavras-passe diferentes',
        'As palavras-passe introduzidas não coincidem.'
      );
      return;
    }

    if (!aceitarTermos) {
      Alert.alert(
        'Termos e condições',
        'Deves aceitar os termos e condições para criar a tua conta.'
      );
      return;
    }

    try {
      setLoading(true);

      const dados = new FormData();
      dados.append('nome', nome.trim());
      dados.append('email', email.trim());
      dados.append('telefone', telefone.trim());
      dados.append('senha', password);
      dados.append('confirmarSenha', confirmarPassword);
      dados.append('tipo', tipoConta);

      if (tipoConta === 'motorista') {
        Object.entries(dadosMotorista).forEach(([campo, valor]) => {
          if (valor.trim()) {
            dados.append(campo, valor.trim());
          }
        });
      }

      if (foto) {
        if (Platform.OS === 'web' && foto.file) {
          dados.append('foto', foto.file, foto.fileName || 'perfil.jpg');
        } else {
          dados.append('foto', new ExpoFile(foto.uri));
        }
      }

      const resposta = await expoFetch(`${API_URL}/auth/registar`, {
        method: 'POST',
        body: dados,
      });
      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
            resultado.message ||
            'Não foi possível criar a conta.'
        );
      }

      Alert.alert(
        'Conta criada',
        resultado.mensagem || 'A tua conta foi criada com sucesso.',
        [{ text: 'Iniciar sessão', onPress: () => router.replace('/login') }]
      );
    } catch (error) {
      Alert.alert(
        'Erro ao criar conta',
        error.message || 'Não foi possível criar a conta. Tenta novamente.'
      );
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
            onPress={() => router.back()}
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
              Cria a tua conta!
            </Text>

            <Text style={styles.headerSubtitle}>
              Começa a descobrir uma nova forma de te movimentares.
            </Text>
          </View>

          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />

        </View>

        {/* FORMULÁRIO */}
        <View style={styles.formContainer}>

          <View style={styles.formHeading}>
            <Text style={styles.title}>
              Criar conta
            </Text>

            <Text style={styles.subtitle}>
              Preenche os teus dados para te juntares à comunidade Bwé-Go.
            </Text>
          </View>

          <Text style={styles.label}>Tipo de conta</Text>
          <View style={styles.accountTypeRow}>
            {[
              { value: 'cliente', label: 'Utilizador', icon: 'person-outline' },
              { value: 'motorista', label: 'Motorista', icon: 'car-outline' },
            ].map((opcao) => {
              const selecionada = tipoConta === opcao.value;

              return (
                <TouchableOpacity
                  key={opcao.value}
                  style={[
                    styles.accountTypeOption,
                    selecionada && styles.accountTypeOptionActive,
                  ]}
                  onPress={() => setTipoConta(opcao.value)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selecionada }}
                >
                  <Ionicons
                    name={opcao.icon}
                    size={19}
                    color={selecionada ? '#FFFFFF' : '#173B70'}
                  />
                  <Text
                    style={[
                      styles.accountTypeText,
                      selecionada && styles.accountTypeTextActive,
                    ]}
                  >
                    {opcao.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.photoPickerSection}>
            <TouchableOpacity
              style={styles.photoPicker}
              onPress={escolherFoto}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Escolher foto de perfil"
            >
              <View style={styles.avatar}>
                {foto ? (
                  <Image source={{ uri: foto.uri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person-outline" size={34} color="#173B70" />
                )}
                <View style={styles.photoAddBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.photoPickerText}>
                {foto ? 'Alterar fotografia' : 'Adicionar fotografia'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Opcional · JPG, PNG ou WEBP</Text>
          </View>

          {/* NOME */}
          <Campo
            label="Nome completo"
            placeholder="Ex: João Manuel"
            icon="person-outline"
            value={nome}
            onChangeText={setNome}
          />

          {/* EMAIL */}
          <Campo
            label="Email"
            placeholder="Ex: joao@email.com"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* TELEFONE */}
          <Campo
            label="Número de telefone"
            placeholder="Ex: 923 000 000"
            icon="call-outline"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            maxLength={15}
          />

          {tipoConta === 'motorista' && (
            <View style={styles.driverFields}>
              <Text style={styles.driverSectionTitle}>Dados do motorista</Text>
              <Text style={styles.driverSectionSubtitle}>
                Estas informações serão enviadas para análise e aprovação.
              </Text>

              <Campo
                label="Número da carta de condução"
                placeholder="Ex: LD123456"
                icon="card-outline"
                value={dadosMotorista.numero_carta_conducao}
                onChangeText={(valor) => atualizarDadoMotorista('numero_carta_conducao', valor)}
                autoCapitalize="characters"
              />
              <Campo
                label="Categoria da carta"
                placeholder="Ex: B"
                icon="list-outline"
                value={dadosMotorista.categoria_carta}
                onChangeText={(valor) => atualizarDadoMotorista('categoria_carta', valor)}
              />
              <Campo
                label="Validade da carta (AAAA-MM-DD)"
                placeholder="Ex: 2030-12-31"
                icon="calendar-outline"
                value={dadosMotorista.validade_carta}
                onChangeText={(valor) => atualizarDadoMotorista('validade_carta', valor)}
                autoCapitalize="none"
              />
              <Campo
                label="Número do BI"
                placeholder="Número do Bilhete de Identidade"
                icon="id-card-outline"
                value={dadosMotorista.numero_bi}
                onChangeText={(valor) => atualizarDadoMotorista('numero_bi', valor)}
                autoCapitalize="characters"
              />
              <Campo
                label="Data de nascimento (AAAA-MM-DD)"
                placeholder="Ex: 1995-06-15"
                icon="calendar-outline"
                value={dadosMotorista.data_nascimento}
                onChangeText={(valor) => atualizarDadoMotorista('data_nascimento', valor)}
                autoCapitalize="none"
              />
              <Campo
                label="Marca do veículo"
                placeholder="Ex: Toyota"
                icon="car-outline"
                value={dadosMotorista.marca_veiculo}
                onChangeText={(valor) => atualizarDadoMotorista('marca_veiculo', valor)}
              />
              <Campo
                label="Modelo do veículo"
                placeholder="Ex: Corolla"
                icon="car-sport-outline"
                value={dadosMotorista.modelo_veiculo}
                onChangeText={(valor) => atualizarDadoMotorista('modelo_veiculo', valor)}
              />
              <Campo
                label="Matrícula"
                placeholder="Matrícula do veículo"
                icon="pricetag-outline"
                value={dadosMotorista.matricula}
                onChangeText={(valor) => atualizarDadoMotorista('matricula', valor)}
                autoCapitalize="characters"
              />
              <Campo
                label="Cor do veículo (opcional)"
                placeholder="Ex: Branco"
                icon="color-palette-outline"
                value={dadosMotorista.cor_veiculo}
                onChangeText={(valor) => atualizarDadoMotorista('cor_veiculo', valor)}
              />
              <Campo
                label="Ano do veículo (opcional)"
                placeholder="Ex: 2020"
                icon="calendar-number-outline"
                value={dadosMotorista.ano_veiculo}
                onChangeText={(valor) => atualizarDadoMotorista('ano_veiculo', valor)}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Campo
                label="Lugares para passageiros"
                placeholder="4"
                icon="people-outline"
                value={dadosMotorista.capacidade_passageiros}
                onChangeText={(valor) => atualizarDadoMotorista('capacidade_passageiros', valor)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          )}

          {/* PALAVRA-PASSE */}
          <Campo
            label="Palavra-passe"
            placeholder="Cria uma palavra-passe"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!mostrarPassword}
            autoCapitalize="none"
            rightIcon={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightPress={() => setMostrarPassword(!mostrarPassword)}
          />

          <Text style={styles.passwordHint}>
            A palavra-passe deve conter pelo menos 8 caracteres.
          </Text>

          {/* CONFIRMAR PALAVRA-PASSE */}
          <Campo
            label="Confirmar palavra-passe"
            placeholder="Repete a palavra-passe"
            icon="shield-checkmark-outline"
            value={confirmarPassword}
            onChangeText={setConfirmarPassword}
            secureTextEntry={!mostrarConfirmar}
            autoCapitalize="none"
            rightIcon={
              mostrarConfirmar ? 'eye-off-outline' : 'eye-outline'
            }
            onRightPress={() =>
              setMostrarConfirmar(!mostrarConfirmar)
            }
          />

          {/* VALIDAÇÃO VISUAL */}
          {confirmarPassword.length > 0 && (
            <View style={styles.validationRow}>
              <Ionicons
                name={
                  password === confirmarPassword
                    ? 'checkmark-circle'
                    : 'close-circle'
                }
                size={16}
                color={
                  password === confirmarPassword
                    ? '#1C9B62'
                    : '#E05252'
                }
              />

              <Text
                style={[
                  styles.validationText,
                  {
                    color:
                      password === confirmarPassword
                        ? '#1C9B62'
                        : '#E05252',
                  },
                ]}
              >
                {password === confirmarPassword
                  ? 'As palavras-passe coincidem'
                  : 'As palavras-passe não coincidem'}
              </Text>
            </View>
          )}

          {/* TERMOS E CONDIÇÕES */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAceitarTermos(!aceitarTermos)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                aceitarTermos && styles.checkboxActive,
              ]}
            >
              {aceitarTermos && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="#FFFFFF"
                />
              )}
            </View>

            <Text style={styles.termsText}>
              Li e aceito os{' '}
              <Text style={styles.termsHighlight}>
                Termos e Condições
              </Text>{' '}
              e a{' '}
              <Text style={styles.termsHighlight}>
                Política de Privacidade
              </Text>
              .
            </Text>
          </TouchableOpacity>

          {/* BOTÃO CRIAR CONTA */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={criarConta}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'A processar...' : 'Criar a minha conta'}
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
            <Text style={styles.dividerText}>JÁ ÉS MEMBRO?</Text>
            <View style={styles.divider} />
          </View>

          {/* LOGIN */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Já tens uma conta?
            </Text>

            <TouchableOpacity
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.loginLink}>
                Iniciar sessão
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

  accountTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
    marginBottom: 22,
  },

  accountTypeOption: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DCE5F0',
    borderRadius: 14,
    backgroundColor: '#FAFBFD',
  },

  accountTypeOptionActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },

  accountTypeText: {
    color: '#173B70',
    fontSize: 13,
    fontWeight: '700',
  },

  accountTypeTextActive: {
    color: '#FFFFFF',
  },

  driverFields: {
    marginTop: 5,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F5F7FB',
  },

  driverSectionTitle: {
    color: '#173B70',
    fontSize: 16,
    fontWeight: '900',
  },

  driverSectionSubtitle: {
    color: '#8490A0',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 18,
  },

  photoPickerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },

  photoPicker: {
    alignItems: 'center',
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EEF3FA',
    borderWidth: 2,
    borderColor: '#DCE5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },

  photoAddBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#173B70',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  photoPickerText: {
    color: '#173B70',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },

  photoHint: {
    color: '#9AA3B0',
    fontSize: 11,
    marginTop: 4,
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
    marginBottom: 19,
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    color: '#173B70',
    fontSize: 14,
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
    marginBottom: 18,
    gap: 6,
  },

  validationText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // TERMOS
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 3,
    marginBottom: 24,
  },

  checkbox: {
    width: 19,
    height: 19,
    borderWidth: 1.5,
    borderColor: '#C7CFD9',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },

  checkboxActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },

  termsText: {
    flex: 1,
    color: '#8490A0',
    fontSize: 11,
    lineHeight: 18,
    marginLeft: 9,
  },

  termsHighlight: {
    color: '#173B70',
    fontWeight: '800',
  },

  // BOTÃO
  registerButton: {
    height: 58,
    backgroundColor: '#F5B51B',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  registerButtonText: {
    color: '#173B70',
    fontSize: 15,
    fontWeight: '900',
  },

  buttonDisabled: {
    opacity: 0.6,
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
