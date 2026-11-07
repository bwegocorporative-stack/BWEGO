
import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  carregarCarteira,
  criarRecargaCarteira,
  transferirCarteira,
} from '../../services/carteira';

const formatarValor = (valor) =>
  `${Number(valor || 0).toLocaleString('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Kz`;

const formatarData = (valor) => {
  if (!valor) return 'Data indisponível';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Data indisponível';
  return data.toLocaleString('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const obterTipoVisual = (tipo) =>
  ['credito', 'reembolso', 'recarga'].includes(tipo) ? 'entrada' : 'saida';

const obterIconeMovimento = (tipo) => {
  if (tipo === 'recarga' || tipo === 'credito') return 'add-circle-outline';
  if (tipo === 'reembolso') return 'refresh-circle-outline';
  if (tipo === 'debito') return 'arrow-up-circle-outline';
  return 'wallet-outline';
};

export default function CarteiraScreen() {

  const [saldoVisivel, setSaldoVisivel] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [carteira, setCarteira] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [metodoSelecionado, setMetodoSelecionado] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modal, setModal] = useState(null);
  const [modalAnterior, setModalAnterior] = useState(null);
  const [movimentoSelecionado, setMovimentoSelecionado] = useState(null);
  const [valor, setValor] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const recarregarCarteira = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const resultado = await carregarCarteira();
      setCarteira(resultado.carteira);
      setMovimentos(resultado.movimentos || []);
      setMetodos(resultado.metodos || []);
      setMetodoSelecionado((atual) =>
        resultado.metodos?.some((metodo) => metodo.id === atual)
          ? atual
          : resultado.metodos?.[0]?.id || ''
      );
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar a carteira.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      recarregarCarteira();
    }, [recarregarCarteira])
  );

  const movimentosFiltrados = movimentos.filter((item) => {
    if (filtro === 'Todos') return true;
    return obterTipoVisual(item.tipo) === filtro;
  });

  const abrirAcao = (tipo) => {
    setValor('');
    setDestinatario('');
    setModalAnterior(null);
    setModal(tipo);
  };

  const submeterRecarga = async () => {
    if (!valor.trim() || !metodoSelecionado) {
      Alert.alert('Dados em falta', 'Indica o valor e escolhe um método de pagamento.');
      return;
    }

    try {
      setEnviando(true);
      const resultado = await criarRecargaCarteira(
        valor.trim().replace(',', '.'),
        metodoSelecionado
      );
      setModal(null);
      setValor('');
      await recarregarCarteira();
      Alert.alert(
        'Pedido de recarga criado',
        `${resultado.mensagem}\nReferência: ${resultado.pagamento.referencia}`
      );
    } catch (error) {
      Alert.alert('Não foi possível adicionar saldo', error.message || 'Tenta novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const submeterTransferencia = async () => {
    if (!valor.trim() || !destinatario.trim()) {
      Alert.alert('Dados em falta', 'Indica o valor e o telefone ou email do destinatário.');
      return;
    }

    try {
      setEnviando(true);
      const resultado = await transferirCarteira(
        valor.trim().replace(',', '.'),
        destinatario.trim()
      );
      setModal(null);
      setValor('');
      setDestinatario('');
      await recarregarCarteira();
      Alert.alert(
        'Transferência concluída',
        `${resultado.mensagem}\nReferência: ${resultado.transferencia.referencia}`
      );
    } catch (error) {
      Alert.alert('Não foi possível transferir', error.message || 'Tenta novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const abrirMetodos = (voltarPara = null) => {
    setModalAnterior(voltarPara);
    setModal('metodos');
  };

  const fecharModal = () => {
    setModal(modalAnterior);
    setModalAnterior(null);
  };

  const abrirRecibo = (item, voltarPara = null) => {
    setMovimentoSelecionado(item);
    setModalAnterior(voltarPara);
    setModal('recibo');
  };

  return (
    <View style={styles.container}>

      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>

          <View>
            <Text style={styles.brand}>BWÉ-GO</Text>

            <Text style={styles.title}>
              Minha carteira
            </Text>

            <Text style={styles.subtitle}>
              Gere o teu dinheiro com facilidade.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notification}
            onPress={recarregarCarteira}
            accessibilityRole="button"
            accessibilityLabel="Atualizar carteira"
          >
            <Ionicons
              name={carregando ? 'hourglass-outline' : 'refresh-outline'}
              size={24}
              color="#101820"
            />
          </TouchableOpacity>

        </View>

        {/* CARTÃO DE SALDO */}
        <View style={styles.balanceCard}>

          <View style={styles.balanceHeader}>

            <View style={styles.balanceLabelContainer}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.balanceLabel}>
                Saldo disponível
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSaldoVisivel(!saldoVisivel)}
            >
              <Ionicons
                name={saldoVisivel ? 'eye-outline' : 'eye-off-outline'}
                size={23}
                color="#FFFFFF"
              />
            </TouchableOpacity>

          </View>

          <Text style={styles.balanceValue}>
            {saldoVisivel
              ? carteira
                ? formatarValor(carteira.saldo)
                : '—'
              : '••••••••'}
          </Text>

          <Text style={styles.balanceDescription}>
            Carteira digital Bwé-Go
          </Text>

          <View style={styles.balanceFooter}>

            <Text style={styles.accountNumber}>
              BWÉ-GO WALLET
            </Text>

            <Ionicons
              name="shield-checkmark"
              size={24}
              color="#FFFFFF"
            />

          </View>

        </View>

        {/* AÇÕES */}
        <View style={styles.actions}>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => abrirAcao('recarga')}
            disabled={carregando}
          >

            <View style={styles.actionIcon}>
              <Ionicons
                name="add"
                size={28}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.actionTitle}>
              Adicionar
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => abrirAcao('transferencia')}
            disabled={carregando}
          >

            <View style={[styles.actionIcon, styles.secondaryIcon]}>
              <Ionicons
                name="arrow-up-outline"
                size={25}
                color="#16A36A"
              />
            </View>

            <Text style={styles.actionTitle}>
              Transferir
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => abrirMetodos()}
            disabled={carregando}
          >

            <View style={[styles.actionIcon, styles.secondaryIcon]}>
              <Ionicons
                name="card-outline"
                size={25}
                color="#16A36A"
              />
            </View>

            <Text style={styles.actionTitle}>
              Métodos
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setModal('recibos')}
          >

            <View style={[styles.actionIcon, styles.secondaryIcon]}>
              <Ionicons
                name="receipt-outline"
                size={25}
                color="#16A36A"
              />
            </View>

            <Text style={styles.actionTitle}>
              Recibos
            </Text>

          </TouchableOpacity>

        </View>

        {/* MÉTODOS DE PAGAMENTO */}
        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            Métodos de pagamento
          </Text>

          <TouchableOpacity onPress={() => abrirMetodos()}>
            <Text style={styles.seeAll}>
              Gerir
            </Text>
          </TouchableOpacity>

        </View>

        {metodos.map((metodo) => (
          <TouchableOpacity
            key={metodo.id}
            style={styles.paymentCard}
            onPress={() => {
              setMetodoSelecionado(metodo.id);
              abrirAcao('recarga');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar saldo com ${metodo.nome}`}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name={metodo.icon} size={25} color="#16A36A" />
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>{metodo.nome}</Text>
              <Text style={styles.paymentDescription}>{metodo.descricao}</Text>
            </View>
            {metodo.id === metodoSelecionado ? (
              <Ionicons name="checkmark-circle" size={20} color="#16A36A" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#999" />
            )}
          </TouchableOpacity>
        ))}

        {/* HISTÓRICO */}
        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            Movimentos recentes
          </Text>

          <TouchableOpacity onPress={() => setModal('recibos')}>
            <Text style={styles.seeAll}>
              Ver todos
            </Text>
          </TouchableOpacity>

        </View>

        {/* FILTROS */}
        <View style={styles.filters}>

          {['Todos', 'entrada', 'saida'].map((item) => {

            const label = item === 'entrada'
              ? 'Entradas'
              : item === 'saida'
                ? 'Saídas'
                : 'Todos';

            return (
              <TouchableOpacity
                key={item}
                onPress={() => setFiltro(item)}
                style={[
                  styles.filterButton,
                  filtro === item && styles.filterActive
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filtro === item && styles.filterTextActive
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );

          })}

        </View>

        {/* LISTA DE MOVIMENTOS */}
        {carregando ? (
          <ActivityIndicator color="#16A36A" style={styles.loading} />
        ) : erro ? (
          <View style={styles.empty}>
            <Text style={styles.errorText}>{erro}</Text>
            <TouchableOpacity onPress={recarregarCarteira}>
              <Text style={styles.seeAll}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : movimentosFiltrados.length > 0 ? (

          movimentosFiltrados.map((item) => {
            const tipoVisual = obterTipoVisual(item.tipo);
            return (
            <TouchableOpacity
              key={item.id}
              style={styles.transactionCard}
              onPress={() => abrirRecibo(item)}
              accessibilityRole="button"
              accessibilityLabel={`Ver recibo: ${item.descricao}`}
            >

              <View style={styles.transactionIcon}>
                <Ionicons
                  name={obterIconeMovimento(item.tipo)}
                  size={24}
                  color={tipoVisual === 'entrada' ? '#16A36A' : '#E65B5B'}
                />
              </View>

              <View style={styles.transactionInfo}>

                <Text style={styles.transactionTitle}>
                  {item.descricao || 'Movimento da carteira'}
                </Text>

                <Text style={styles.transactionDescription}>
                  {item.estado === 'pendente'
                    ? 'A aguardar confirmação'
                    : item.estado === 'processando'
                      ? 'Em processamento'
                      : item.referencia || 'Sem referência'}
                </Text>

                <Text style={styles.transactionDate}>
                  {formatarData(item.criado_em)}
                </Text>

              </View>

              <Text
                style={[
                  styles.transactionValue,
                  {
                    color: tipoVisual === 'entrada'
                      ? '#16A36A'
                      : '#101820'
                  }
                ]}
              >
                {tipoVisual === 'entrada' ? '+ ' : '− '}
                {formatarValor(item.valor)}
              </Text>

            </TouchableOpacity>
          )})

        ) : (

          <View style={styles.empty}>
            <Ionicons
              name="wallet-outline"
              size={45}
              color="#BBBBBB"
            />

            <Text style={styles.emptyText}>
              Nenhum movimento encontrado.
            </Text>
          </View>

        )}

        {/* SEGURANÇA */}
        <View style={styles.security}>

          <Ionicons
            name="shield-checkmark-outline"
            size={23}
            color="#16A36A"
          />

          <View style={{ flex: 1 }}>

            <Text style={styles.securityTitle}>
              Os teus pagamentos protegidos
            </Text>

            <Text style={styles.securityDescription}>
              A tua carteira foi concebida para proporcionar
              segurança e transparência nas transações.
            </Text>

          </View>

        </View>

      </ScrollView>

      <Modal
        visible={modal === 'recarga'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adicionar saldo</Text>
            <Text style={styles.modalDescription}>
              Escolhe o valor e o método para criar um pedido de recarga.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={valor}
              onChangeText={setValor}
              placeholder="Valor em Kz"
              keyboardType="decimal-pad"
              accessibilityLabel="Valor da recarga"
            />
            <TouchableOpacity
              style={styles.methodSelector}
              onPress={() => abrirMetodos('recarga')}
              disabled={enviando}
            >
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentDescription}>Método de pagamento</Text>
                <Text style={styles.paymentTitle}>
                  {metodos.find((item) => item.id === metodoSelecionado)?.nome ||
                    'Selecionar método'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#777" />
            </TouchableOpacity>
            <Text style={styles.modalNotice}>
              A recarga fica pendente e só aumenta o saldo após confirmação do pagamento.
            </Text>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, enviando && styles.disabledButton]}
              onPress={submeterRecarga}
              disabled={enviando}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryText}>Criar pedido</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModal(null)}
              disabled={enviando}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modal === 'transferencia'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Transferir saldo</Text>
            <Text style={styles.modalDescription}>
              O valor será enviado imediatamente para uma carteira Bwé-Go ativa.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={destinatario}
              onChangeText={setDestinatario}
              placeholder="Telefone ou email do destinatário"
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Telefone ou email do destinatário"
            />
            <TextInput
              style={styles.modalInput}
              value={valor}
              onChangeText={setValor}
              placeholder="Valor em Kz"
              keyboardType="decimal-pad"
              accessibilityLabel="Valor da transferência"
            />
            <Text style={styles.modalNotice}>
              Saldo disponível: {carteira ? formatarValor(carteira.saldo) : '—'}
            </Text>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, enviando && styles.disabledButton]}
              onPress={submeterTransferencia}
              disabled={enviando}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryText}>Transferir</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModal(null)}
              disabled={enviando}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modal === 'metodos'}
        transparent
        animationType="slide"
        onRequestClose={fecharModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Métodos de pagamento</Text>
            <Text style={styles.modalDescription}>
              Seleciona o método que pretendes usar numa recarga.
            </Text>
            {metodos.map((metodo) => (
              <TouchableOpacity
                key={metodo.id}
                style={styles.methodOption}
                onPress={() => {
                  setMetodoSelecionado(metodo.id);
                  fecharModal();
                }}
              >
                <View style={styles.paymentIcon}>
                  <Ionicons name={metodo.icon} size={22} color="#16A36A" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{metodo.nome}</Text>
                  <Text style={styles.paymentDescription}>{metodo.descricao}</Text>
                </View>
                {metodo.id === metodoSelecionado && (
                  <Ionicons name="checkmark-circle" size={21} color="#16A36A" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={fecharModal}
            >
              <Text style={styles.modalCancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modal === 'recibos'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.receiptsCard]}>
            <Text style={styles.modalTitle}>Movimentos e recibos</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {movimentos.length ? movimentos.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.receiptRow}
                  onPress={() => abrirRecibo(item, 'recibos')}
                >
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>
                      {item.descricao || 'Movimento da carteira'}
                    </Text>
                    <Text style={styles.paymentDescription}>
                      {item.referencia || 'Sem referência'} · {formatarData(item.criado_em)}
                    </Text>
                  </View>
                  <Text style={styles.transactionValue}>
                    {formatarValor(item.valor)}
                  </Text>
                </TouchableOpacity>
              )) : (
                <Text style={styles.emptyText}>Ainda não existem recibos.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModal(null)}
            >
              <Text style={styles.modalCancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modal === 'recibo'}
        transparent
        animationType="fade"
        onRequestClose={fecharModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.receiptIcon}>
              <Ionicons
                name={movimentoSelecionado
                  ? obterIconeMovimento(movimentoSelecionado.tipo)
                  : 'receipt-outline'}
                size={30}
                color="#16A36A"
              />
            </View>
            <Text style={styles.modalTitle}>Recibo</Text>
            <Text style={styles.receiptAmount}>
              {movimentoSelecionado
                ? formatarValor(movimentoSelecionado.valor)
                : '—'}
            </Text>
            <Text style={styles.receiptDescription}>
              {movimentoSelecionado?.descricao || 'Movimento da carteira'}
            </Text>
            <View style={styles.receiptDetails}>
              <Text style={styles.receiptDetailLabel}>Estado</Text>
              <Text style={styles.receiptDetailValue}>
                {movimentoSelecionado?.estado === 'pendente'
                  ? 'Pendente de confirmação'
                  : movimentoSelecionado?.estado === 'processando'
                    ? 'Em processamento'
                    : 'Concluído'}
              </Text>
              <Text style={styles.receiptDetailLabel}>Referência</Text>
              <Text style={styles.receiptDetailValue}>
                {movimentoSelecionado?.referencia || '—'}
              </Text>
              <Text style={styles.receiptDetailLabel}>Data</Text>
              <Text style={styles.receiptDetailValue}>
                {formatarData(movimentoSelecionado?.criado_em)}
              </Text>
              {movimentoSelecionado?.metodo && (
                <>
                  <Text style={styles.receiptDetailLabel}>Método</Text>
                  <Text style={styles.receiptDetailValue}>
                    {metodos.find((item) => item.id === movimentoSelecionado.metodo)?.nome ||
                      movimentoSelecionado.metodo}
                  </Text>
                </>
              )}
              {movimentoSelecionado?.saldo_posterior != null && (
                <>
                  <Text style={styles.receiptDetailLabel}>Saldo após movimento</Text>
                  <Text style={styles.receiptDetailValue}>
                    {formatarValor(movimentoSelecionado.saldo_posterior)}
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={fecharModal}
            >
              <Text style={styles.modalPrimaryText}>Fechar recibo</Text>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20
  },

  header: {
    marginTop: 55,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  brand: {
    fontSize: 11,
    fontWeight: '900',
    color: '#16A36A',
    letterSpacing: 2
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#101820',
    marginTop: 5
  },

  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 6
  },

  notification: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#F4F6F5',
    justifyContent: 'center',
    alignItems: 'center'
  },

  balanceCard: {
    backgroundColor: '#16A36A',
    borderRadius: 22,
    padding: 22,
    minHeight: 190
  },

  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9
  },

  balanceLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },

  balanceValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 22
  },

  balanceDescription: {
    color: '#E5F5ED',
    fontSize: 11,
    marginTop: 5
  },

  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22
  },

  accountNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 10
  },

  actionButton: {
    alignItems: 'center',
    width: '23%'
  },

  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center'
  },

  secondaryIcon: {
    backgroundColor: '#E5F5ED'
  },

  actionTitle: {
    fontSize: 11,
    color: '#101820',
    fontWeight: '700',
    marginTop: 9
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 15
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#101820'
  },

  seeAll: {
    color: '#16A36A',
    fontSize: 12,
    fontWeight: '800'
  },

  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    marginBottom: 10
  },

  paymentIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#E5F5ED',
    justifyContent: 'center',
    alignItems: 'center'
  },

  paymentInfo: {
    flex: 1,
    marginLeft: 12
  },

  paymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#101820'
  },

  paymentDescription: {
    fontSize: 11,
    color: '#888',
    marginTop: 5
  },

  filters: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15
  },

  filterButton: {
    backgroundColor: '#F4F6F5',
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 12
  },

  filterActive: {
    backgroundColor: '#16A36A'
  },

  filterText: {
    fontSize: 11,
    color: '#777',
    fontWeight: '700'
  },

  filterTextActive: {
    color: '#FFFFFF'
  },

  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },

  transactionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#F4F6F5',
    justifyContent: 'center',
    alignItems: 'center'
  },

  transactionInfo: {
    flex: 1,
    marginLeft: 12
  },

  transactionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#101820'
  },

  transactionDescription: {
    fontSize: 11,
    color: '#888',
    marginTop: 4
  },

  transactionDate: {
    fontSize: 10,
    color: '#AAAAAA',
    marginTop: 5
  },

  transactionValue: {
    fontSize: 12,
    fontWeight: '900'
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 35
  },

  emptyText: {
    color: '#888',
    fontSize: 12,
    marginTop: 12
  },

  loading: {
    paddingVertical: 30
  },

  errorText: {
    color: '#B42318',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 24, 32, 0.55)',
    padding: 20
  },

  modalCard: {
    maxHeight: '90%',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 22
  },

  receiptsCard: {
    minHeight: 260
  },

  modalTitle: {
    color: '#101820',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8
  },

  modalDescription: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18
  },

  modalInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E3E8E5',
    borderRadius: 13,
    color: '#101820',
    paddingHorizontal: 14,
    marginBottom: 12
  },

  methodSelector: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E8E5',
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 10
  },

  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F1',
    paddingVertical: 12
  },

  modalNotice: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 16
  },

  modalPrimaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A36A',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginTop: 5
  },

  disabledButton: {
    opacity: 0.65
  },

  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },

  modalCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },

  modalCancelText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700'
  },

  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F1',
    paddingVertical: 12
  },

  receiptIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#E5F5ED',
    alignSelf: 'center',
    marginBottom: 14
  },

  receiptAmount: {
    color: '#101820',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center'
  },

  receiptDescription: {
    color: '#667085',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20
  },

  receiptDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E9ECEB',
    paddingTop: 14,
    marginBottom: 12
  },

  receiptDetailLabel: {
    color: '#8995A6',
    fontSize: 11,
    marginTop: 8
  },

  receiptDetailValue: {
    color: '#101820',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3
  },

  security: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F4F9F6',
    padding: 16,
    borderRadius: 16,
    marginTop: 25,
    marginBottom: 30
  },

  securityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#101820'
  },

  securityDescription: {
    fontSize: 10,
    color: '#888',
    lineHeight: 16,
    marginTop: 5
  }

});
