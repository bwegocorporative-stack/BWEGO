import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  terminarSessao,
  obterUsuario,
  carregarPerfilUsuario,
  atualizarPerfilUsuario,
  alterarPalavraPasse,
} from "../../services/authSession";
import {
  atualizarAprovacaoMotorista,
  atualizarEstadoParceiro,
  atualizarEstadoProduto,
  atualizarClienteAdmin,
  atualizarMotoristaAdmin,
  atualizarParceiroAdmin,
  atualizarProdutoAdmin,
  criarParceiroAdmin,
  criarProdutoAdmin,
  listarClientesAdmin,
  listarCategoriasAdmin,
  listarFarmaciasAdmin,
  listarMotoristasAdmin,
  listarParceirosAdmin,
  listarProdutosAdmin,
  obterDashboardAdmin,
  listarGestoresAdmin,
  criarGestorAdmin,
  removerGestorAdmin,
  removerParceiroAdmin,
  removerProdutoAdmin,
  removerCategoriaAdmin,
  criarCategoriaAdmin,
  atualizarCategoriaAdmin,
} from "../../services/admin";

const SECOES = [
  { id: "dashboard", titulo: "Dashboard", icon: "grid-outline" },
  { id: "clientes", titulo: "Clientes", icon: "people-outline" },
  { id: "motoristas", titulo: "Motoristas", icon: "car-sport-outline" },
  { id: "aprovacoes", titulo: "Aprovações", icon: "shield-checkmark-outline" },
  { id: "parceiros", titulo: "Parceiros", icon: "storefront-outline" },
  { id: "farmacias", titulo: "Farmácias", icon: "medical-outline" },
  { id: "produtos", titulo: "Produtos", icon: "pricetags-outline" },
  { id: "categorias", titulo: "Categorias", icon: "albums-outline" },
  { id: "gestores", titulo: "Gestores", icon: "people-outline" },
  { id: "configuracoes", titulo: "Configurações", icon: "settings-outline" },
];

const CAMPOS_EDICAO = {
  clientes: [
    { key: "nome", label: "Nome completo" },
    { key: "email", label: "Email", keyboardType: "email-address" },
    { key: "telefone", label: "Telefone", keyboardType: "phone-pad" },
  ],
  motoristas: [
    { key: "nome", label: "Nome completo" },
    { key: "email", label: "Email", keyboardType: "email-address" },
    { key: "telefone", label: "Telefone", keyboardType: "phone-pad" },
    { key: "numero_carta_conducao", label: "N.º carta de condução" },
    { key: "categoria_carta", label: "Categoria da carta" },
    { key: "validade_carta", label: "Validade da carta (AAAA-MM-DD)" },
    { key: "numero_bi", label: "N.º Bilhete de Identidade" },
    { key: "marca_veiculo", label: "Marca do veículo" },
    { key: "modelo_veiculo", label: "Modelo do veículo" },
    { key: "matricula", label: "Matrícula" },
    { key: "cor_veiculo", label: "Cor do veículo" },
    { key: "ano_veiculo", label: "Ano do veículo", keyboardType: "number-pad" },
    { key: "capacidade_passageiros", label: "Capacidade", keyboardType: "number-pad" },
  ],
  parceiros: [
    { key: "nome_comercial", label: "Nome comercial" },
    { key: "nome_empresa", label: "Nome da empresa" },
    { key: "nif", label: "NIF" },
    { key: "telefone", label: "Telefone", keyboardType: "phone-pad" },
    { key: "email", label: "Email", keyboardType: "email-address" },
    { key: "descricao", label: "Descrição", multiline: true },
    { key: "endereco", label: "Endereço", multiline: true },
    { key: "municipio", label: "Município" },
    { key: "provincia", label: "Província" },
  ],
  farmacias: [
    { key: "nome_comercial", label: "Nome da farmácia" },
    { key: "nome_empresa", label: "Nome da empresa" },
    { key: "nif", label: "NIF" },
    { key: "telefone", label: "Telefone", keyboardType: "phone-pad" },
    { key: "email", label: "Email", keyboardType: "email-address" },
    { key: "descricao", label: "Descrição", multiline: true },
    { key: "endereco", label: "Endereço", multiline: true },
    { key: "municipio", label: "Município" },
    { key: "provincia", label: "Província" },
  ],
  produtos: [
    { key: "nome", label: "Nome do produto" },
    { key: "categoria_nome", label: "Categoria" },
    { key: "descricao", label: "Descrição", multiline: true },
    { key: "preco", label: "Preço (Kz)", keyboardType: "decimal-pad" },
    { key: "preco_promocional", label: "Preço promocional (Kz)", keyboardType: "decimal-pad" },
    { key: "unidade", label: "Unidade" },
    { key: "codigo_barras", label: "Código de barras" },
  ],
  categorias: [
    { key: "nome", label: "Nome da categoria" },
    { key: "descricao", label: "Descrição", multiline: true },
  ],
};

const TIPOS_EMPRESA = [
  { valor: "supermercado", titulo: "Supermercado" },
  { valor: "restaurante", titulo: "Restaurante" },
  { valor: "loja", titulo: "Loja" },
  { valor: "mercearia", titulo: "Mercearia" },
  { valor: "distribuidor", titulo: "Distribuidor" },
  { valor: "outros", titulo: "Outro" },
];

const CAMPOS_PARCEIRO_NOVO = [
  { key: "nome_comercial", label: "Nome comercial *" },
  { key: "nome_empresa", label: "Nome da empresa" },
  { key: "nif", label: "NIF" },
  { key: "telefone", label: "Telefone *", keyboardType: "phone-pad" },
  { key: "email", label: "Email", keyboardType: "email-address" },
  { key: "descricao", label: "Descrição", multiline: true },
  { key: "endereco", label: "Endereço *", multiline: true },
  { key: "municipio", label: "Município" },
  { key: "provincia", label: "Província" },
];

const CAMPOS_PRODUTO_NOVO = [
  { key: "nome", label: "Nome do produto *" },
  { key: "categoria_nome", label: "Nova categoria (opcional)" },
  { key: "descricao", label: "Descrição", multiline: true },
  { key: "preco", label: "Preço (Kz) *", keyboardType: "decimal-pad" },
  { key: "preco_promocional", label: "Preço promocional (Kz)", keyboardType: "decimal-pad" },
  { key: "unidade", label: "Unidade" },
  { key: "codigo_barras", label: "Código de barras" },
];

const formatarData = (valor) => {
  if (!valor) return "Data não disponível";
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "Data não disponível"
    : data.toLocaleDateString("pt-AO");
};

const formatarEstado = (estado) =>
  String(estado || "desconhecido")
    .replaceAll("_", " ")
    .replace(/^./, (letra) => letra.toLocaleUpperCase());

const categoriaAtiva = (categoria) =>
  categoria.ativo === undefined ||
  categoria.ativo === true ||
  categoria.ativo === 1 ||
  categoria.ativo === "1";

function CartaoResumo({ titulo, valor, icon, cor, onPress }) {
  return (
    <TouchableOpacity
      style={styles.summaryCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.summaryIcon, { backgroundColor: cor }]}>
        <Ionicons name={icon} size={21} color="#173B70" />
      </View>
      <Text style={styles.summaryValue}>{Number(valor || 0).toLocaleString("pt-AO")}</Text>
      <Text style={styles.summaryTitle}>{titulo}</Text>
    </TouchableOpacity>
  );
}

function Estado({ valor }) {
  const ativo = ["aprovado", "ativo", "disponivel", "1", "true"].includes(
    String(valor).toLocaleLowerCase()
  );
  return (
    <View style={[styles.statusPill, ativo ? styles.statusActive : styles.statusPending]}>
      <Text style={[styles.statusText, ativo ? styles.statusTextActive : styles.statusTextPending]}>
        {formatarEstado(valor)}
      </Text>
    </View>
  );
}

function GraficoBarras({ titulo, serie, cor, formatoValor }) {
  const valoresPorMes = new Map(
    (serie || []).map((item) => [item.mes, Number(item.total || 0)])
  );
  const agora = new Date();
  const meses = Array.from({ length: 6 }, (_, indice) => {
    const data = new Date(agora.getFullYear(), agora.getMonth() - 5 + indice, 1);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    return {
      chave,
      titulo: data.toLocaleDateString("pt-AO", { month: "short" }).replace(".", ""),
      valor: valoresPorMes.get(chave) || 0,
    };
  });
  const maximo = Math.max(...meses.map((mes) => mes.valor), 1);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{titulo}</Text>
      <View style={styles.chartPlot}>
        {meses.map((mes) => (
          <View key={mes.chave} style={styles.chartColumn}>
            <Text style={styles.chartValue} numberOfLines={1}>
              {formatoValor(mes.valor)}
            </Text>
            <View style={styles.chartBarTrack}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: `${Math.max((mes.valor / maximo) * 100, mes.valor ? 8 : 0)}%`,
                    backgroundColor: cor,
                  },
                ]}
              />
            </View>
            <Text style={styles.chartMonth}>{mes.titulo}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SeletorImagemPerfil({
  uri,
  onPress,
  disabled,
  titulo = "Imagem de perfil *",
}) {
  return (
    <View style={styles.profileImagePicker}>
      <View style={styles.profileImagePreview}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="storefront-outline" size={30} color="#667085" />
        )}
      </View>
      <View style={styles.profileImageDescription}>
        <Text style={styles.editLabel}>{titulo}</Text>
        <Text style={styles.imageHint}>
          Formatos JPG, PNG ou WEBP; máximo 5 MB.
        </Text>
        <TouchableOpacity
          style={styles.chooseImageButton}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Ionicons name="image-outline" size={17} color="#173B70" />
          <Text style={styles.chooseImageText}>
            {uri ? "Alterar imagem" : "Selecionar imagem"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const [secao, setSecao] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [registos, setRegistos] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [pesquisaAplicada, setPesquisaAplicada] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [adminAtualId, setAdminAtualId] = useState(null);
  const [erro, setErro] = useState("");
  const [erroLogout, setErroLogout] = useState("");
  const [sucessoConfiguracoes, setSucessoConfiguracoes] = useState("");
  const [perfilAdmin, setPerfilAdmin] = useState(null);
  const [dadosPerfilAdmin, setDadosPerfilAdmin] = useState({ nome: "", telefone: "" });
  const [palavrasPasse, setPalavrasPasse] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });
  const [aGuardarPerfilAdmin, setAGuardarPerfilAdmin] = useState(false);
  const [aAlterarPalavraPasse, setAAlterarPalavraPasse] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);
  const [aTerminarSessao, setATerminarSessao] = useState(false);
  const [aAtualizarId, setAAtualizarId] = useState(null);
  const [registoEmEdicao, setRegistoEmEdicao] = useState(null);
  const [registoEmRemocao, setRegistoEmRemocao] = useState(null);
  const [motoristaEmAprovacao, setMotoristaEmAprovacao] = useState(null);
  const [aRemoverRegisto, setARemoverRegisto] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState({});
  const [imagemPerfil, setImagemPerfil] = useState(null);
  const [aGuardarEdicao, setAGuardarEdicao] = useState(false);
  const [tipoCriacao, setTipoCriacao] = useState(null);
  const [dadosCriacao, setDadosCriacao] = useState({});
  const [parceirosDisponiveis, setParceirosDisponiveis] = useState([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState([]);
  const [aCarregarParceiros, setACarregarParceiros] = useState(false);
  const [aCriarRegisto, setACriarRegisto] = useState(false);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      if (secao === "dashboard") {
        setDashboard(await obterDashboardAdmin());
        return;
      }
      if (secao === "configuracoes") {
        const perfil = await carregarPerfilUsuario();
        if (!perfil || perfil.tipo !== "admin") {
          throw new Error("Não foi possível carregar o perfil do administrador.");
        }
        setPerfilAdmin(perfil);
        setDadosPerfilAdmin({
          nome: perfil.nome || "",
          telefone: perfil.telefone || "",
        });
        return;
      }
      if (secao === "gestores") {
        setRegistos(await listarGestoresAdmin());
        return;
      }

      const filtros = { pesquisa: pesquisaAplicada, pagina: 1, limite: 50 };
      let resultado;
      if (secao === "clientes") {
        resultado = await listarClientesAdmin(filtros);
      } else if (secao === "motoristas") {
        resultado = await listarMotoristasAdmin(filtros);
      } else if (secao === "aprovacoes") {
        resultado = await listarMotoristasAdmin({
          ...filtros,
          estado_aprovacao: "pendente",
        });
      } else if (secao === "parceiros") {
        resultado = await listarParceirosAdmin(filtros);
      } else if (secao === "farmacias") {
        resultado = await listarFarmaciasAdmin(filtros);
      } else if (secao === "categorias") {
        resultado = await listarCategoriasAdmin(filtros);
      } else {
        resultado = await listarProdutosAdmin(filtros);
      }
      setRegistos(resultado);
    } catch (error) {
      setErro(error.message || "Não foi possível carregar os dados.");
      if (error.status === 401 || error.status === 403) {
        router.replace(Platform.OS === "web" ? "/admin/login" : "/login");
      }
    } finally {
      setCarregando(false);
    }
  }, [pesquisaAplicada, secao]);

  const abrirEdicao = (registo) => {
    setRegistoEmEdicao(registo);
    setImagemPerfil(null);
    setDadosEdicao(
      Object.fromEntries(
        (CAMPOS_EDICAO[secao] || CAMPOS_EDICAO.motoristas).map(({ key }) => [
          key,
          registo[key] == null ? "" : String(registo[key]),
        ])
      )
    );
  };

  const guardarEdicao = async () => {
    if (!registoEmEdicao) return;
    const campos = CAMPOS_EDICAO[secao] || CAMPOS_EDICAO.motoristas;
    const dadosAlterados = Object.fromEntries(
      campos
        .filter(({ key }) => {
          const original = registoEmEdicao[key] == null
            ? ""
            : String(registoEmEdicao[key]);
          return (dadosEdicao[key] || "") !== original;
        })
        .map(({ key }) => [key, dadosEdicao[key]])
    );
    const editaImagemParceiro =
      secao === "parceiros" || secao === "farmacias";
    const editaImagemProduto = secao === "produtos" && Boolean(imagemPerfil);
    if (
      !Object.keys(dadosAlterados).length &&
      !(editaImagemParceiro && imagemPerfil) &&
      !editaImagemProduto
    ) {
      setRegistoEmEdicao(null);
      return;
    }

    setAGuardarEdicao(true);
    try {
      if (secao === "clientes") {
        await atualizarClienteAdmin(registoEmEdicao.id, dadosAlterados);
      } else if (secao === "motoristas" || secao === "aprovacoes") {
        await atualizarMotoristaAdmin(registoEmEdicao.id, dadosAlterados);
      } else if (secao === "parceiros" || secao === "farmacias") {
        await atualizarParceiroAdmin(
          registoEmEdicao.id,
          dadosAlterados,
          imagemPerfil
        );
      } else if (secao === "categorias") {
        await atualizarCategoriaAdmin({
          id: registoEmEdicao.id,
          nome_atual: registoEmEdicao.nome,
          ...dadosAlterados,
        });
      } else {
        await atualizarProdutoAdmin(registoEmEdicao.id, dadosAlterados, imagemPerfil);
      }
      setRegistoEmEdicao(null);
      setImagemPerfil(null);
      await carregarDados();
    } catch (error) {
      Alert.alert("Não foi possível guardar", error.message);
    } finally {
      setAGuardarEdicao(false);
    }
  };

  const removerRegisto = async () => {
    if (!registoEmRemocao) return;
    setARemoverRegisto(true);
    try {
      if (registoEmRemocao.tipo === "produto") {
        await removerProdutoAdmin(registoEmRemocao.item.id);
      } else if (registoEmRemocao.tipo === "categoria") {
        await removerCategoriaAdmin(
          registoEmRemocao.item.id,
          registoEmRemocao.item.nome
        );
      } else if (registoEmRemocao.tipo === "gestor") {
        await removerGestorAdmin(registoEmRemocao.item.id);
      } else {
        await removerParceiroAdmin(registoEmRemocao.item.id);
      }
      setRegistoEmRemocao(null);
      await carregarDados();
    } catch (error) {
      Alert.alert("Não foi possível excluir", error.message);
    } finally {
      setARemoverRegisto(false);
    }
  };

  const abrirCriacao = async (tipo) => {
    setTipoCriacao(tipo);
    setImagemPerfil(null);
    setDadosCriacao(
      tipo === "produto"
        ? { tipo_estabelecimento: "parceiro", unidade: "unidade", categoria_id: "" }
        : tipo === "categoria" || tipo === "gestor"
          ? {}
        : { tipo_empresa: "supermercado" }
    );
    if (tipo === "produto") {
      setACarregarParceiros(true);
      try {
        const [parceiros, categorias] = await Promise.all([
          listarParceirosAdmin({ limite: 100 }),
          listarCategoriasAdmin({ limite: 100 }),
        ]);
        setParceirosDisponiveis(parceiros);
        setCategoriasDisponiveis(categorias);
      } catch (error) {
        setParceirosDisponiveis([]);
        setCategoriasDisponiveis([]);
        Alert.alert("Não foi possível carregar", error.message);
      } finally {
        setACarregarParceiros(false);
      }
    }
  };

  const criarRegisto = async () => {
    const farmacia = tipoCriacao === "farmacia";
    if (tipoCriacao === "gestor") {
      if (
        !dadosCriacao.nome?.trim() ||
        !dadosCriacao.email?.trim() ||
        !dadosCriacao.telefone?.trim() ||
        !dadosCriacao.senha ||
        !dadosCriacao.confirmarSenha
      ) {
        Alert.alert("Campos obrigatórios", "Preenche todos os dados do novo gestor.");
        return;
      }
      if (dadosCriacao.senha.length < 12) {
        Alert.alert("Palavra-passe inválida", "A palavra-passe deve ter pelo menos 12 caracteres.");
        return;
      }
      if (dadosCriacao.senha !== dadosCriacao.confirmarSenha) {
        Alert.alert("Palavras-passe diferentes", "Confirma a palavra-passe corretamente.");
        return;
      }
    }
    if (tipoCriacao === "categoria" && !dadosCriacao.nome?.trim()) {
      Alert.alert("Campo obrigatório", "Indica o nome da categoria.");
      return;
    }
    if (farmacia || tipoCriacao === "parceiro") {
      if (
        !dadosCriacao.nome_comercial?.trim() ||
        !dadosCriacao.telefone?.trim() ||
        !dadosCriacao.endereco?.trim() ||
        !imagemPerfil
      ) {
        Alert.alert(
          "Campos obrigatórios",
          "Preenche o nome, telefone, endereço e seleciona uma imagem de perfil."
        );
        return;
      }
    } else if (tipoCriacao === "produto") {
      const preco = Number(String(dadosCriacao.preco || "").replace(",", "."));
      if (
        !dadosCriacao.parceiro_id ||
        !dadosCriacao.nome?.trim() ||
        (!dadosCriacao.categoria_id && !dadosCriacao.categoria_nome?.trim()) ||
        !Number.isFinite(preco) ||
        preco < 0 ||
        !imagemPerfil
      ) {
        Alert.alert(
          "Dados incompletos",
          "Escolhe a farmácia ou empresa, informa o nome, categoria e preço válido, e seleciona uma imagem para o produto."
        );
        return;
      }
    }

    setACriarRegisto(true);
    try {
      if (tipoCriacao === "produto") {
        const dados = {
          ...dadosCriacao,
          parceiro_id: Number(dadosCriacao.parceiro_id),
          preco: Number(String(dadosCriacao.preco).replace(",", ".")),
          preco_promocional: dadosCriacao.preco_promocional
            ? Number(String(dadosCriacao.preco_promocional).replace(",", "."))
            : null,
        };
        delete dados.tipo_estabelecimento;
        await criarProdutoAdmin(dados, imagemPerfil);
      } else if (tipoCriacao === "categoria") {
        await criarCategoriaAdmin({
          nome: dadosCriacao.nome,
          descricao: dadosCriacao.descricao,
        });
      } else if (tipoCriacao === "gestor") {
        await criarGestorAdmin(dadosCriacao);
      } else {
        await criarParceiroAdmin(
          dadosCriacao,
          imagemPerfil,
          farmacia
        );
      }
      setTipoCriacao(null);
      setImagemPerfil(null);
      await carregarDados();
      Alert.alert(
        "Registo criado",
        tipoCriacao === "gestor"
          ? "O gestor foi adicionado com sucesso."
          : tipoCriacao === "produto"
          ? "O produto foi adicionado com sucesso."
          : tipoCriacao === "categoria"
            ? "A categoria foi adicionada com sucesso."
            : farmacia
              ? "A farmácia foi adicionada com sucesso."
              : "O parceiro foi adicionado com sucesso."
      );
    } catch (error) {
      Alert.alert("Não foi possível adicionar", error.message);
    } finally {
      setACriarRegisto(false);
    }
  };

  const selecionarImagemPerfil = async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!resultado.canceled && resultado.assets?.[0]) {
        setImagemPerfil(resultado.assets[0]);
      }
    } catch (error) {
      Alert.alert(
        "Não foi possível abrir as fotografias",
        error.message || "Tenta selecionar a imagem novamente."
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      const verificarAdministrador = async () => {
        const usuario = await obterUsuario();
        if (!ativo) return;
        if (usuario?.tipo !== "admin") {
          router.replace(Platform.OS === "web" ? "/admin/login" : "/login");
          return;
        }
        setAdminAtualId(usuario.id);
        await carregarDados();
      };
      void verificarAdministrador();
      return () => {
        ativo = false;
      };
    }, [carregarDados])
  );

  const terminar = () => {
    setErroLogout("");
    setConfirmarLogout(true);
  };

  const confirmarTerminarSessao = async () => {
    setATerminarSessao(true);
    setErroLogout("");
    try {
      await terminarSessao();
      router.replace(Platform.OS === "web" ? "/admin/login" : "/login");
    } catch (error) {
      setErroLogout(error.message || "Não foi possível terminar a sessão.");
    } finally {
      setATerminarSessao(false);
    }
  };

  const guardarPerfilAdmin = async () => {
    if (!perfilAdmin) return;
    setAGuardarPerfilAdmin(true);
    setErro("");
    setSucessoConfiguracoes("");
    try {
      const perfilAtualizado = await atualizarPerfilUsuario({
        nome: dadosPerfilAdmin.nome,
        telefone: dadosPerfilAdmin.telefone,
        email: perfilAdmin.email || "",
      });
      setPerfilAdmin(perfilAtualizado);
      setDadosPerfilAdmin({
        nome: perfilAtualizado.nome || "",
        telefone: perfilAtualizado.telefone || "",
      });
      setSucessoConfiguracoes("Os dados do administrador foram guardados.");
    } catch (error) {
      setErro(error.message || "Não foi possível atualizar o perfil.");
    } finally {
      setAGuardarPerfilAdmin(false);
    }
  };

  const guardarNovaPalavraPasse = async () => {
    setAAlterarPalavraPasse(true);
    setErro("");
    setSucessoConfiguracoes("");
    try {
      await alterarPalavraPasse(palavrasPasse);
      setPalavrasPasse({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
      setSucessoConfiguracoes("A palavra-passe foi atualizada.");
    } catch (error) {
      setErro(error.message || "Não foi possível alterar a palavra-passe.");
    } finally {
      setAAlterarPalavraPasse(false);
    }
  };

  const solicitarAprovacao = (motorista, estado_aprovacao) => {
    setErro("");
    setMotoristaEmAprovacao({ motorista, estado_aprovacao });
  };

  const alterarAprovacao = async () => {
    if (!motoristaEmAprovacao) return;
    const { motorista, estado_aprovacao } = motoristaEmAprovacao;
    setAAtualizarId(String(motorista.id));
    try {
      await atualizarAprovacaoMotorista(motorista.id, estado_aprovacao);
      setMotoristaEmAprovacao(null);
      await carregarDados();
    } catch (error) {
      setErro(error.message || "Não foi possível atualizar a aprovação.");
    } finally {
      setAAtualizarId(null);
    }
  };

  const alternarEstado = async (registo, tipo) => {
    const id = String(registo.id);
    setAAtualizarId(id);
    try {
      if (tipo === "parceiro") {
        await atualizarEstadoParceiro(id, !Boolean(registo.ativo));
      } else {
        await atualizarEstadoProduto(id, !Boolean(registo.ativo));
      }
      await carregarDados();
    } catch (error) {
      Alert.alert("Não foi possível atualizar", error.message);
    } finally {
      setAAtualizarId(null);
    }
  };

  const aplicarPesquisa = () => setPesquisaAplicada(pesquisa.trim());

  const renderConfiguracoes = () => (
    <>
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeading}>
          <View style={styles.settingsIcon}>
            <Ionicons name="person-outline" size={22} color="#173B70" />
          </View>
          <View style={styles.settingsHeadingText}>
            <Text style={styles.settingsTitle}>Perfil do administrador</Text>
            <Text style={styles.settingsSubtitle}>
              Atualiza os teus dados de contacto.
            </Text>
          </View>
        </View>
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Nome</Text>
          <TextInput
            style={styles.editInput}
            value={dadosPerfilAdmin.nome}
            onChangeText={(nome) =>
              setDadosPerfilAdmin((atual) => ({ ...atual, nome }))
            }
            autoCapitalize="words"
            editable={!aGuardarPerfilAdmin}
          />
        </View>
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Telefone</Text>
          <TextInput
            style={styles.editInput}
            value={dadosPerfilAdmin.telefone}
            onChangeText={(telefone) =>
              setDadosPerfilAdmin((atual) => ({ ...atual, telefone }))
            }
            keyboardType="phone-pad"
            editable={!aGuardarPerfilAdmin}
          />
        </View>
        <View style={styles.editField}>
          <Text style={styles.editLabel}>Email</Text>
          <TextInput
            style={[styles.editInput, styles.settingsReadOnlyInput]}
            value={perfilAdmin?.email || ""}
            editable={false}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <TouchableOpacity
          style={[styles.settingsSaveButton, aGuardarPerfilAdmin && styles.submitDisabled]}
          onPress={guardarPerfilAdmin}
          disabled={aGuardarPerfilAdmin || aAlterarPalavraPasse}
          accessibilityRole="button"
        >
          {aGuardarPerfilAdmin ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.settingsSaveText}>Guardar perfil</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingsHeading}>
          <View style={[styles.settingsIcon, styles.passwordSettingsIcon]}>
            <Ionicons name="lock-closed-outline" size={22} color="#173B70" />
          </View>
          <View style={styles.settingsHeadingText}>
            <Text style={styles.settingsTitle}>Alterar palavra-passe</Text>
            <Text style={styles.settingsSubtitle}>
              Confirma a palavra-passe atual para continuar.
            </Text>
          </View>
        </View>
        {[
          { key: "senhaAtual", label: "Palavra-passe atual" },
          { key: "novaSenha", label: "Nova palavra-passe" },
          { key: "confirmarSenha", label: "Confirmar nova palavra-passe" },
        ].map((campo) => (
          <View key={campo.key} style={styles.editField}>
            <Text style={styles.editLabel}>{campo.label}</Text>
            <TextInput
              style={styles.editInput}
              value={palavrasPasse[campo.key]}
              onChangeText={(valor) =>
                setPalavrasPasse((atual) => ({ ...atual, [campo.key]: valor }))
              }
              secureTextEntry
              autoCapitalize="none"
              editable={!aAlterarPalavraPasse}
            />
          </View>
        ))}
        <Text style={styles.passwordHint}>A nova palavra-passe deve ter pelo menos 8 caracteres.</Text>
        <TouchableOpacity
          style={[styles.settingsSaveButton, aAlterarPalavraPasse && styles.submitDisabled]}
          onPress={guardarNovaPalavraPasse}
          disabled={aAlterarPalavraPasse || aGuardarPerfilAdmin}
          accessibilityRole="button"
        >
          {aAlterarPalavraPasse ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.settingsSaveText}>Atualizar palavra-passe</Text>
          )}
        </TouchableOpacity>
      </View>
      {!!sucessoConfiguracoes && (
        <View style={styles.settingsSuccess}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#16804A" />
          <Text style={styles.settingsSuccessText}>{sucessoConfiguracoes}</Text>
        </View>
      )}
    </>
  );

  const renderDashboard = () => (
    <>
      <Text style={styles.sectionHeading}>Visão geral</Text>
      <Text style={styles.sectionDescription}>
        Resumo atualizado dos principais serviços da Bwé-Go.
      </Text>
      <View style={styles.summaryGrid}>
        <CartaoResumo
          titulo="Clientes"
          valor={dashboard?.clientes}
          icon="people-outline"
          cor="#E8EEFF"
          onPress={() => setSecao("clientes")}
        />
        <CartaoResumo
          titulo="Motoristas"
          valor={dashboard?.motoristas}
          icon="car-sport-outline"
          cor="#E8F5E9"
          onPress={() => setSecao("motoristas")}
        />
        <CartaoResumo
          titulo="Aprovações pendentes"
          valor={dashboard?.motoristas_pendentes}
          icon="time-outline"
          cor="#FFF2DC"
          onPress={() => setSecao("aprovacoes")}
        />
        <CartaoResumo
          titulo="Parceiros"
          valor={dashboard?.parceiros}
          icon="storefront-outline"
          cor="#F1EAFE"
          onPress={() => setSecao("parceiros")}
        />
        <CartaoResumo
          titulo="Farmácias"
          valor={dashboard?.farmacias}
          icon="medical-outline"
          cor="#E7F5F5"
          onPress={() => setSecao("farmacias")}
        />
        <CartaoResumo
          titulo="Produtos"
          valor={dashboard?.produtos}
          icon="pricetags-outline"
          cor="#FCE8E8"
          onPress={() => setSecao("produtos")}
        />
        <CartaoResumo
          titulo="Viagens"
          valor={dashboard?.viagens}
          icon="map-outline"
          cor="#E7F5F5"
          onPress={null}
        />
        <CartaoResumo
          titulo="Pedidos"
          valor={dashboard?.pedidos}
          icon="receipt-outline"
          cor="#EAF0FA"
          onPress={null}
        />
        <CartaoResumo
          titulo="Pagamentos"
          valor={dashboard?.pagamentos}
          icon="card-outline"
          cor="#FFF2DC"
          onPress={null}
        />
      </View>
      <View style={styles.activeTrips}>
        <Ionicons name="navigate-circle-outline" size={25} color="#16A36A" />
        <Text style={styles.activeTripsText}>
          Viagens em curso: {Number(dashboard?.viagens_ativas || 0)}
        </Text>
      </View>
      <View style={styles.activeTrips}>
        <Ionicons name="cash-outline" size={23} color="#16A36A" />
        <Text style={styles.activeTripsText}>
          Pagamentos concluídos:{" "}
          {Number(dashboard?.volume_pago || 0).toLocaleString("pt-AO")} Kz
        </Text>
      </View>
      <GraficoBarras
        titulo="Viagens nos últimos 6 meses"
        serie={dashboard?.viagens_por_mes}
        cor="#16A36A"
        formatoValor={(valor) => Number(valor).toLocaleString("pt-AO")}
      />
      <GraficoBarras
        titulo="Pagamentos recebidos (Kz)"
        serie={dashboard?.pagamentos_por_mes}
        cor="#F5B91B"
        formatoValor={(valor) =>
          valor >= 1000000
            ? `${(valor / 1000000).toFixed(1)}M`
            : valor >= 1000
              ? `${(valor / 1000).toFixed(0)}k`
              : Number(valor).toLocaleString("pt-AO")
        }
      />
    </>
  );

  const renderCartaoRegisto = (item) => {
    const nome =
      item.nome ||
      item.nome_comercial ||
      item.parceiro_nome ||
      "Sem nome";
    const imagem =
      item.foto_url ||
      item.logo_url ||
      item.imagem_url ||
      item.imagem_principal;
    const status =
      item.estado_aprovacao ??
      item.disponibilidade ??
      (item.ativo === undefined ? item.estado : item.ativo ? "ativo" : "inativo");
    const subtitulo =
      item.email ||
      item.telefone ||
      item.tipo_empresa ||
      item.categoria_nome ||
      item.categoria ||
      item.descricao ||
      "";

    return (
      <View
        key={`${secao}-${item.id ?? item.nome ?? item.nome_comercial ?? "registo"}`}
        style={styles.recordCard}
      >
        <View style={styles.recordHeader}>
          {imagem ? (
            <Image source={{ uri: imagem }} style={styles.recordImage} />
          ) : (
            <View style={styles.recordImagePlaceholder}>
              <Ionicons
                name={
                  secao === "produtos"
                    ? "pricetag-outline"
                    : secao === "categorias"
                      ? "albums-outline"
                      : secao === "farmacias"
                        ? "medical-outline"
                        : "person-outline"
                }
                size={21}
                color="#173B70"
              />
            </View>
          )}
          <View style={styles.recordInfo}>
            <Text style={styles.recordName} numberOfLines={2}>{nome}</Text>
            {!!subtitulo && (
              <Text style={styles.recordSubtitle} numberOfLines={1}>{subtitulo}</Text>
            )}
          </View>
          {status !== undefined && <Estado valor={status} />}
        </View>

        {secao === "motoristas" || secao === "aprovacoes" ? (
          <View style={styles.recordDetails}>
            <Text style={styles.recordDetail}>
              {[item.marca_veiculo, item.modelo_veiculo].filter(Boolean).join(" ") || "Veículo não indicado"}
            </Text>
            <Text style={styles.recordDetail}>
              Cadastro: {formatarData(item.data_cadastro || item.criado_em)}
            </Text>
            {(secao === "aprovacoes" || secao === "motoristas") && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  disabled={
                    aAtualizarId === String(item.id) ||
                    item.estado_aprovacao === "aprovado"
                  }
                  onPress={() => solicitarAprovacao(item, "aprovado")}
                  accessibilityRole="button"
                  accessibilityLabel={`Aprovar motorista ${nome}`}
                >
                  <Text style={styles.approveButtonText}>
                    {item.estado_aprovacao === "aprovado" ? "Aprovado" : "Aprovar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  disabled={
                    aAtualizarId === String(item.id) ||
                    item.estado_aprovacao === "rejeitado"
                  }
                  onPress={() => solicitarAprovacao(item, "rejeitado")}
                  accessibilityRole="button"
                  accessibilityLabel={`Reprovar motorista ${nome}`}
                >
                  <Text style={styles.rejectButtonText}>
                    {item.estado_aprovacao === "rejeitado" ? "Reprovado" : "Reprovar"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => abrirEdicao(item)}
              disabled={aAtualizarId === String(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Editar dados de ${nome}`}
            >
              <Ionicons name="create-outline" size={17} color="#173B70" />
              <Text style={styles.editButtonText}>Editar dados</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {secao === "clientes" && (
          <View style={styles.recordDetails}>
            <Text style={styles.recordDetail}>
              Registado em {formatarData(item.criado_em)}
            </Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => abrirEdicao(item)}
              disabled={aGuardarEdicao || aRemoverRegisto}
              accessibilityRole="button"
              accessibilityLabel={`Editar dados de ${nome}`}
            >
              <Ionicons name="create-outline" size={17} color="#173B70" />
              <Text style={styles.editButtonText}>Editar cliente</Text>
            </TouchableOpacity>
          </View>
        )}

        {secao === "gestores" && (
          <View style={styles.recordActions}>
            {Number(item.ativo) === 1 && String(item.id) !== String(adminAtualId) ? (
              <TouchableOpacity
                style={[styles.recordActionButton, styles.recordDeleteAction]}
                onPress={() => setRegistoEmRemocao({ tipo: "gestor", item })}
                disabled={aRemoverRegisto}
                accessibilityRole="button"
                accessibilityLabel={`Remover gestor ${item.nome}`}
              >
                <Ionicons name="person-remove-outline" size={16} color="#B42318" />
                <Text style={styles.recordDeleteActionText}>Remover gestor</Text>
              </TouchableOpacity>
            ) : String(item.id) === String(adminAtualId) ? (
              <Text style={styles.managerSelfLabel}>A tua conta</Text>
            ) : (
              <Text style={styles.managerInactiveLabel}>Conta desativada</Text>
            )}
          </View>
        )}

        {secao === "categorias" && (
          <View style={styles.recordActions}>
            <TouchableOpacity
              style={[styles.recordActionButton, styles.recordEditAction]}
              onPress={() => abrirEdicao(item)}
              disabled={aGuardarEdicao || aRemoverRegisto}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={16} color="#173B70" />
              <Text style={styles.recordEditActionText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.recordActionButton, styles.recordDeleteAction]}
              onPress={() => setRegistoEmRemocao({ tipo: "categoria", item })}
              disabled={aRemoverRegisto}
              accessibilityRole="button"
              accessibilityLabel={`Excluir categoria ${item.nome}`}
            >
              <Ionicons name="trash-outline" size={16} color="#B42318" />
              <Text style={styles.recordDeleteActionText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}

        {(secao === "parceiros" || secao === "farmacias") && (
          <View style={styles.recordDetails}>
            <Text style={styles.recordDetail}>
              {[item.municipio, item.provincia].filter(Boolean).join(", ") || item.endereco || "Localização não indicada"}
            </Text>
            <View style={styles.recordActions}>
              <TouchableOpacity
                style={[styles.recordActionButton, styles.recordEditAction]}
                onPress={() => abrirEdicao(item)}
                disabled={aAtualizarId === String(item.id) || aRemoverRegisto}
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={16} color="#173B70" />
                <Text style={styles.recordEditActionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordActionButton, styles.recordDeleteAction]}
                onPress={() => setRegistoEmRemocao({ tipo: "estabelecimento", item })}
                disabled={aAtualizarId === String(item.id) || aRemoverRegisto}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${item.nome_comercial || item.nome || "estabelecimento"}`}
              >
                <Ionicons name="trash-outline" size={16} color="#B42318" />
                <Text style={styles.recordDeleteActionText}>Remover</Text>
              </TouchableOpacity>
            </View>
            {item.ativo !== undefined && (
              <TouchableOpacity
                style={styles.textAction}
                disabled={aAtualizarId === String(item.id)}
                onPress={() => alternarEstado(item, "parceiro")}
              >
                <Text style={styles.textActionLabel}>
                  {Boolean(item.ativo) ? "Desativar parceiro" : "Ativar parceiro"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {secao === "produtos" && (
          <View style={styles.recordDetails}>
            <Text style={styles.recordDetail}>
              {item.parceiro_nome || "Parceiro não indicado"}
            </Text>
            <Text style={styles.productPrice}>
              {Number(item.preco || 0).toLocaleString("pt-AO")} Kz
            </Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => abrirEdicao(item)}
              disabled={aAtualizarId === String(item.id) || aGuardarEdicao}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={17} color="#173B70" />
              <Text style={styles.editButtonText}>Editar produto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.recordActionButton, styles.recordDeleteAction, styles.productDeleteAction]}
              onPress={() => setRegistoEmRemocao({ tipo: "produto", item })}
              disabled={aRemoverRegisto}
              accessibilityRole="button"
              accessibilityLabel={`Excluir produto ${item.nome}`}
            >
              <Ionicons name="trash-outline" size={16} color="#B42318" />
              <Text style={styles.recordDeleteActionText}>Excluir produto</Text>
            </TouchableOpacity>
            {item.ativo !== undefined && (
              <TouchableOpacity
                style={styles.textAction}
                disabled={aAtualizarId === String(item.id)}
                onPress={() => alternarEstado(item, "produto")}
              >
                <Text style={styles.textActionLabel}>
                  {Boolean(item.ativo) ? "Desativar produto" : "Ativar produto"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const secaoSelecionada = SECOES.find((item) => item.id === secao);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#173B70" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>BWÉ-GO · ADMINISTRAÇÃO</Text>
          <Text style={styles.headerTitle}>{secaoSelecionada?.titulo}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={terminar}
          accessibilityRole="button"
          accessibilityLabel="Terminar sessão de administração"
        >
          <Ionicons name="log-out-outline" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        style={styles.navigation}
        contentContainerStyle={styles.navigationContent}
        showsHorizontalScrollIndicator={false}
      >
        {SECOES.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.navigationItem, secao === item.id && styles.navigationItemActive]}
            onPress={() => {
              setPesquisa("");
              setPesquisaAplicada("");
              setSecao(item.id);
            }}
          >
            <Ionicons
              name={item.icon}
              size={17}
              color={secao === item.id ? "#173B70" : "#667085"}
            />
            <Text style={[styles.navigationText, secao === item.id && styles.navigationTextActive]}>
              {item.titulo}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={carregarDados} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {secao !== "dashboard" && (
          <View style={styles.sectionTop}>
            <Text style={styles.sectionHeading}>{secaoSelecionada?.titulo}</Text>
            <Text style={styles.sectionDescription}>
              {secao === "aprovacoes"
                ? "Analisa e decide os pedidos de aprovação dos motoristas."
                : secao === "farmacias"
                  ? "Consulta e edita os dados das farmácias registadas."
                  : secao === "configuracoes"
                    ? "Gere o teu perfil e a segurança da conta administrativa."
                  : "Consulta, edita e acompanha os registos da plataforma."}
            </Text>
            {["parceiros", "farmacias", "produtos", "categorias", "gestores"].includes(secao) && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  abrirCriacao(
                    secao === "farmacias"
                      ? "farmacia"
                      : secao === "produtos"
                        ? "produto"
                        : secao === "categorias"
                          ? "categoria"
                            : secao === "gestores"
                              ? "gestor"
                          : "parceiro"
                  )
                }
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={19} color="#FFFFFF" />
                <Text style={styles.addButtonText}>
                  {secao === "farmacias"
                    ? "Adicionar farmácia"
                    : secao === "produtos"
                      ? "Adicionar produto"
                      : secao === "categorias"
                        ? "Adicionar categoria"
                        : secao === "gestores"
                          ? "Adicionar gestor"
                      : "Adicionar parceiro"}
                </Text>
              </TouchableOpacity>
            )}
            {secao !== "aprovacoes" &&
              secao !== "configuracoes" &&
              secao !== "gestores" && (
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={19} color="#667085" />
                <TextInput
                  style={styles.searchInput}
                  value={pesquisa}
                  onChangeText={setPesquisa}
                  placeholder="Pesquisar..."
                  placeholderTextColor="#98A2B3"
                  returnKeyType="search"
                  onSubmitEditing={aplicarPesquisa}
                  accessibilityLabel={`Pesquisar ${secao}`}
                />
                <TouchableOpacity onPress={aplicarPesquisa} accessibilityLabel="Aplicar pesquisa">
                  <Ionicons name="arrow-forward-circle" size={24} color="#16A36A" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {erro ? (
          <View style={styles.messageCard}>
            <Ionicons name="alert-circle-outline" size={30} color="#D92D20" />
            <Text style={styles.errorText}>{erro}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={carregarDados}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : carregando && secao === "dashboard" && !dashboard ? (
          <ActivityIndicator style={styles.loading} size="large" color="#173B70" />
        ) : secao === "dashboard" ? (
          renderDashboard()
        ) : secao === "configuracoes" ? (
          carregando && !perfilAdmin ? (
            <ActivityIndicator style={styles.loading} size="large" color="#173B70" />
          ) : (
            renderConfiguracoes()
          )
        ) : carregando && registos.length === 0 ? (
          <ActivityIndicator style={styles.loading} size="large" color="#173B70" />
        ) : registos.length ? (
          registos.map(renderCartaoRegisto)
        ) : (
          <View style={styles.messageCard}>
            <Ionicons name="file-tray-outline" size={32} color="#98A2B3" />
            <Text style={styles.emptyText}>Não foram encontrados registos.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={confirmarLogout}
        transparent
        animationType="fade"
        onRequestClose={() => !aTerminarSessao && setConfirmarLogout(false)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons name="log-out-outline" size={25} color="#B42318" />
            </View>
            <Text style={styles.confirmTitle}>Terminar sessão?</Text>
            <Text style={styles.confirmMessage}>
              Queres sair da área de administração?
            </Text>
            {!!erroLogout && <Text style={styles.errorText}>{erroLogout}</Text>}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setConfirmarLogout(false)}
                disabled={aTerminarSessao}
                accessibilityRole="button"
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmDeleteButton,
                  aTerminarSessao && styles.submitDisabled,
                ]}
                onPress={confirmarTerminarSessao}
                disabled={aTerminarSessao}
                accessibilityRole="button"
              >
                {aTerminarSessao ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Sim, sair</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!registoEmEdicao}
        transparent
        animationType="slide"
        onRequestClose={() => !aGuardarEdicao && setRegistoEmEdicao(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editModal}>
            <View style={styles.modalHeading}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalTitle}>
                  {secao === "produtos"
                    ? "Editar produto"
                    : secao === "categorias"
                      ? "Editar categoria"
                      : "Editar dados"}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {registoEmEdicao?.nome ||
                    registoEmEdicao?.nome_comercial ||
                    "Registo"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRegistoEmEdicao(null)}
                disabled={aGuardarEdicao}
                accessibilityRole="button"
                accessibilityLabel="Fechar edição"
              >
                <Ionicons name="close-circle-outline" size={27} color="#667085" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.editFieldsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {(CAMPOS_EDICAO[secao] || CAMPOS_EDICAO.motoristas)
                .filter((campo) =>
                  !(secao === "categorias" &&
                    registoEmEdicao?.id == null &&
                    campo.key === "descricao")
                )
                .map((campo) => (
                  <View key={campo.key} style={styles.editField}>
                    <Text style={styles.editLabel}>{campo.label}</Text>
                    <TextInput
                      style={[
                        styles.editInput,
                        campo.multiline && styles.editInputMultiline,
                      ]}
                      value={dadosEdicao[campo.key] || ""}
                      onChangeText={(valor) =>
                        setDadosEdicao((atual) => ({
                          ...atual,
                          [campo.key]: valor,
                        }))
                      }
                      keyboardType={campo.keyboardType || "default"}
                      autoCapitalize={campo.keyboardType === "email-address" ? "none" : "sentences"}
                      multiline={campo.multiline}
                      editable={!aGuardarEdicao}
                    />
                  </View>
                ))}
              {secao === "produtos" && (
                <SeletorImagemPerfil
                  uri={
                    imagemPerfil?.uri ||
                    registoEmEdicao?.imagem_url ||
                    registoEmEdicao?.imagem_principal
                  }
                  onPress={selecionarImagemPerfil}
                  disabled={aGuardarEdicao}
                  titulo="Imagem do produto"
                />
              )}
              {(secao === "parceiros" || secao === "farmacias") && (
                <SeletorImagemPerfil
                  uri={
                    imagemPerfil?.uri ||
                    registoEmEdicao?.logo_url ||
                    registoEmEdicao?.logotipo
                  }
                  onPress={selecionarImagemPerfil}
                  disabled={aGuardarEdicao}
                />
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={() => setRegistoEmEdicao(null)}
                disabled={aGuardarEdicao}
              >
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditButton, aGuardarEdicao && styles.submitDisabled]}
                onPress={guardarEdicao}
                disabled={aGuardarEdicao}
              >
                {aGuardarEdicao ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveEditText}>Guardar alterações</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!registoEmRemocao}
        transparent
        animationType="fade"
        onRequestClose={() => !aRemoverRegisto && setRegistoEmRemocao(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={25} color="#B42318" />
            </View>
            <Text style={styles.confirmTitle}>
              {registoEmRemocao?.tipo === "estabelecimento" ||
                registoEmRemocao?.tipo === "gestor"
                ? "Confirmar remoção"
                : "Confirmar exclusão"}
            </Text>
            <Text style={styles.confirmMessage}>
              {registoEmRemocao?.tipo === "estabelecimento"
                ? "Confirmas a remoção de "
                : registoEmRemocao?.tipo === "gestor"
                  ? "Confirmas a remoção do gestor "
                  : "Confirmas que pretendes excluir "}
              <Text style={styles.confirmName}>
                {registoEmRemocao?.item?.nome_comercial ||
                  registoEmRemocao?.item?.nome ||
                  "este registo"}
              </Text>
              ? Esta ação não pode ser desfeita.
              {registoEmRemocao?.tipo === "produto"
                ? " Se o produto estiver associado a pedidos, não será possível excluí-lo; desativa-o para o ocultar e preservar o histórico."
                : registoEmRemocao?.tipo === "gestor"
                  ? " A conta será desativada e perderá acesso ao painel. O último gestor e a tua própria conta não podem ser removidos."
                : registoEmRemocao?.tipo === "categoria" &&
                    registoEmRemocao.item?.id == null
                  ? ' Os produtos associados serão mantidos com a categoria "Sem categoria".'
                  : registoEmRemocao?.tipo === "categoria"
                    ? " Só é possível excluir categorias sem produtos associados."
                    : " Se existirem produtos ou pedidos associados, poderá ser necessário resolvê-los antes da remoção."}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setRegistoEmRemocao(null)}
                disabled={aRemoverRegisto}
                accessibilityRole="button"
                accessibilityLabel="Cancelar exclusão"
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteButton, aRemoverRegisto && styles.submitDisabled]}
                onPress={removerRegisto}
                disabled={aRemoverRegisto}
                accessibilityRole="button"
                accessibilityLabel={
                  registoEmRemocao?.tipo === "estabelecimento" ||
                  registoEmRemocao?.tipo === "gestor"
                    ? "Confirmar remoção"
                    : "Confirmar exclusão"
                }
              >
                {aRemoverRegisto ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteText}>
                    {registoEmRemocao?.tipo === "estabelecimento" ||
                    registoEmRemocao?.tipo === "gestor"
                      ? "Sim, remover"
                      : "Sim, excluir"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!motoristaEmAprovacao}
        transparent
        animationType="fade"
        onRequestClose={() => !aAtualizarId && setMotoristaEmAprovacao(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmModal}>
            <View
              style={[
                styles.confirmIcon,
                motoristaEmAprovacao?.estado_aprovacao === "aprovado" &&
                  styles.approvalConfirmIcon,
              ]}
            >
              <Ionicons
                name={
                  motoristaEmAprovacao?.estado_aprovacao === "aprovado"
                    ? "checkmark-circle-outline"
                    : "close-circle-outline"
                }
                size={25}
                color={
                  motoristaEmAprovacao?.estado_aprovacao === "aprovado"
                    ? "#16804A"
                    : "#B42318"
                }
              />
            </View>
            <Text style={styles.confirmTitle}>
              {motoristaEmAprovacao?.estado_aprovacao === "aprovado"
                ? "Confirmar aprovação"
                : "Confirmar reprovação"}
            </Text>
            <Text style={styles.confirmMessage}>
              Confirmas que pretendes{" "}
              {motoristaEmAprovacao?.estado_aprovacao === "aprovado"
                ? "aprovar"
                : "reprovar"}{" "}
              <Text style={styles.confirmName}>
                {motoristaEmAprovacao?.motorista?.nome || "este motorista"}
              </Text>
              ?
            </Text>
            {!!erro && <Text style={styles.errorText}>{erro}</Text>}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setMotoristaEmAprovacao(null)}
                disabled={Boolean(aAtualizarId)}
                accessibilityRole="button"
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmDeleteButton,
                  motoristaEmAprovacao?.estado_aprovacao === "aprovado" &&
                    styles.approvalConfirmButton,
                  Boolean(aAtualizarId) && styles.submitDisabled,
                ]}
                onPress={alterarAprovacao}
                disabled={Boolean(aAtualizarId)}
                accessibilityRole="button"
              >
                {aAtualizarId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteText}>
                    {motoristaEmAprovacao?.estado_aprovacao === "aprovado"
                      ? "Sim, aprovar"
                      : "Sim, reprovar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!tipoCriacao}
        transparent
        animationType="slide"
        onRequestClose={() => !aCriarRegisto && setTipoCriacao(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editModal}>
            <View style={styles.modalHeading}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalTitle}>
                  {tipoCriacao === "gestor"
                    ? "Adicionar gestor"
                    : tipoCriacao === "farmacia"
                    ? "Adicionar farmácia"
                    : tipoCriacao === "produto"
                      ? "Adicionar produto"
                      : tipoCriacao === "categoria"
                        ? "Adicionar categoria"
                        : "Adicionar parceiro"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {tipoCriacao === "gestor"
                    ? "Cria uma conta administrativa para gerir a plataforma."
                    : tipoCriacao === "produto"
                    ? "Associa o produto a uma farmácia ou empresa parceira."
                    : tipoCriacao === "categoria"
                      ? "As categorias gerais podem ser usadas por várias farmácias e parceiros."
                      : "Preenche os dados do estabelecimento."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTipoCriacao(null)}
                disabled={aCriarRegisto}
                accessibilityRole="button"
                accessibilityLabel="Fechar cadastro"
              >
                <Ionicons name="close-circle-outline" size={27} color="#667085" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editFieldsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {tipoCriacao === "gestor" && (
                <>
                  {[
                    { key: "nome", label: "Nome completo *", autoCapitalize: "words" },
                    { key: "email", label: "Email *", keyboardType: "email-address", autoCapitalize: "none" },
                    { key: "telefone", label: "Telefone *", keyboardType: "phone-pad" },
                    { key: "senha", label: "Palavra-passe (mínimo 12 caracteres) *", secureTextEntry: true, autoCapitalize: "none" },
                    { key: "confirmarSenha", label: "Confirmar palavra-passe *", secureTextEntry: true, autoCapitalize: "none" },
                  ].map((campo) => (
                    <View key={campo.key} style={styles.editField}>
                      <Text style={styles.editLabel}>{campo.label}</Text>
                      <TextInput
                        style={styles.editInput}
                        value={dadosCriacao[campo.key] || ""}
                        onChangeText={(valor) =>
                          setDadosCriacao((atual) => ({
                            ...atual,
                            [campo.key]: valor,
                          }))
                        }
                        keyboardType={campo.keyboardType || "default"}
                        autoCapitalize={campo.autoCapitalize || "sentences"}
                        secureTextEntry={campo.secureTextEntry}
                        editable={!aCriarRegisto}
                      />
                    </View>
                  ))}
                </>
              )}
              {(tipoCriacao === "parceiro" || tipoCriacao === "farmacia") && (
                <>
                  {tipoCriacao === "farmacia" ? (
                    <View style={styles.selectedTypeNotice}>
                      <Ionicons name="medical-outline" size={18} color="#173B70" />
                      <Text style={styles.selectedTypeText}>
                        Farmácia — será registada como estabelecimento farmacêutico.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>Tipo de empresa parceira *</Text>
                      <View style={styles.optionList}>
                        {TIPOS_EMPRESA.map((tipo) => (
                          <TouchableOpacity
                            key={tipo.valor}
                            style={[
                              styles.optionChip,
                              dadosCriacao.tipo_empresa === tipo.valor && styles.optionChipSelected,
                            ]}
                            onPress={() =>
                              setDadosCriacao((atual) => ({
                                ...atual,
                                tipo_empresa: tipo.valor,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.optionChipText,
                                dadosCriacao.tipo_empresa === tipo.valor && styles.optionChipTextSelected,
                              ]}
                            >
                              {tipo.titulo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {!categoriasDisponiveis.some((categoria) =>
                          categoriaAtiva(categoria) &&
                          (!categoria.parceiro_id ||
                            String(categoria.parceiro_id) === String(dadosCriacao.parceiro_id))
                        ) && (
                          <Text style={styles.noEstablishmentText}>
                            Ainda não há categorias disponíveis. Adiciona uma na secção Categorias.
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                  {CAMPOS_PARCEIRO_NOVO.map((campo) => (
                    <View key={campo.key} style={styles.editField}>
                      <Text style={styles.editLabel}>{campo.label}</Text>
                      <TextInput
                        style={[
                          styles.editInput,
                          campo.multiline && styles.editInputMultiline,
                        ]}
                        value={dadosCriacao[campo.key] || ""}
                        onChangeText={(valor) =>
                          setDadosCriacao((atual) => ({
                            ...atual,
                            [campo.key]: valor,
                          }))
                        }
                        keyboardType={campo.keyboardType || "default"}
                        autoCapitalize={campo.keyboardType === "email-address" ? "none" : "sentences"}
                        multiline={campo.multiline}
                        editable={!aCriarRegisto}
                      />
                    </View>
                  ))}
                  <SeletorImagemPerfil
                    uri={imagemPerfil?.uri}
                    onPress={selecionarImagemPerfil}
                    disabled={aCriarRegisto}
                  />
                </>
              )}
              {tipoCriacao === "categoria" && (
                <>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Nome da categoria *</Text>
                    <TextInput
                      style={styles.editInput}
                      value={dadosCriacao.nome || ""}
                      onChangeText={(nome) =>
                        setDadosCriacao((atual) => ({ ...atual, nome }))
                      }
                      maxLength={120}
                      editable={!aCriarRegisto}
                      placeholder="Ex.: Medicamentos"
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Descrição (opcional)</Text>
                    <TextInput
                      style={[styles.editInput, styles.editInputMultiline]}
                      value={dadosCriacao.descricao || ""}
                      onChangeText={(descricao) =>
                        setDadosCriacao((atual) => ({ ...atual, descricao }))
                      }
                      maxLength={500}
                      multiline
                      editable={!aCriarRegisto}
                      placeholder="Descreve os produtos desta categoria."
                    />
                  </View>
                </>
              )}

              {tipoCriacao === "produto" && (
                <>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Tipo de estabelecimento *</Text>
                    <View style={styles.optionList}>
                      {[
                        { valor: "parceiro", titulo: "Empresa parceira" },
                        { valor: "farmacia", titulo: "Farmácia" },
                      ].map((tipo) => (
                        <TouchableOpacity
                          key={tipo.valor}
                          style={[
                            styles.optionChip,
                            dadosCriacao.tipo_estabelecimento === tipo.valor && styles.optionChipSelected,
                          ]}
                          onPress={() =>
                            setDadosCriacao((atual) => ({
                              ...atual,
                              tipo_estabelecimento: tipo.valor,
                              parceiro_id: "",
                              categoria_id: "",
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              dadosCriacao.tipo_estabelecimento === tipo.valor && styles.optionChipTextSelected,
                            ]}
                          >
                            {tipo.titulo}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Selecionar estabelecimento *</Text>
                    {aCarregarParceiros ? (
                      <ActivityIndicator color="#173B70" />
                    ) : (
                      <View style={styles.establishmentList}>
                        {parceirosDisponiveis
                          .filter((parceiro) => {
                            const ativo = parceiro.ativo === true ||
                              parceiro.ativo === 1 ||
                              parceiro.ativo === "1";
                            const corresponde =
                              dadosCriacao.tipo_estabelecimento === "farmacia"
                                ? parceiro.tipo_empresa === "farmacia"
                                : parceiro.tipo_empresa !== "farmacia";
                            return ativo && corresponde;
                          })
                          .map((parceiro) => (
                            <TouchableOpacity
                              key={String(parceiro.id)}
                              style={[
                                styles.establishmentOption,
                                String(dadosCriacao.parceiro_id) === String(parceiro.id) &&
                                  styles.establishmentOptionSelected,
                              ]}
                              onPress={() =>
                                setDadosCriacao((atual) => ({
                                  ...atual,
                                  parceiro_id: String(parceiro.id),
                                }))
                              }
                            >
                              <Ionicons
                                name={
                                  parceiro.tipo_empresa === "farmacia"
                                    ? "medical-outline"
                                    : "storefront-outline"
                                }
                                size={18}
                                color="#173B70"
                              />
                              <Text style={styles.establishmentOptionText}>
                                {parceiro.nome_comercial}
                              </Text>
                              {String(dadosCriacao.parceiro_id) === String(parceiro.id) && (
                                <Ionicons name="checkmark-circle" size={18} color="#16804A" />
                              )}
                            </TouchableOpacity>
                          ))}
                        {!parceirosDisponiveis.some((parceiro) => {
                          const ativo = parceiro.ativo === true ||
                            parceiro.ativo === 1 ||
                            parceiro.ativo === "1";
                          return ativo && (dadosCriacao.tipo_estabelecimento === "farmacia"
                            ? parceiro.tipo_empresa === "farmacia"
                            : parceiro.tipo_empresa !== "farmacia");
                        }) && (
                          <Text style={styles.noEstablishmentText}>
                            Não há estabelecimentos ativos deste tipo. Adiciona primeiro uma farmácia ou parceiro.
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Categoria do produto *</Text>
                    <View style={styles.establishmentList}>
                      {categoriasDisponiveis
                        .filter(categoriaAtiva)
                        .filter((categoria) =>
                          !categoria.parceiro_id ||
                          String(categoria.parceiro_id) === String(dadosCriacao.parceiro_id)
                        )
                        .map((categoria) => (
                          <TouchableOpacity
                            key={String(categoria.id ?? categoria.nome)}
                            style={[
                              styles.establishmentOption,
                              (categoria.id != null
                                ? String(dadosCriacao.categoria_id) === String(categoria.id)
                                : dadosCriacao.categoria_nome === categoria.nome) &&
                                styles.establishmentOptionSelected,
                            ]}
                            onPress={() =>
                              setDadosCriacao((atual) => ({
                                ...atual,
                                categoria_id: categoria.id == null ? "" : String(categoria.id),
                                categoria_nome: categoria.id == null ? categoria.nome : "",
                              }))
                            }
                          >
                            <Text style={styles.establishmentOptionText}>{categoria.nome}</Text>
                            {(categoria.id != null
                              ? String(dadosCriacao.categoria_id) === String(categoria.id)
                              : dadosCriacao.categoria_nome === categoria.nome) && (
                              <Ionicons name="checkmark-circle" size={18} color="#16804A" />
                            )}
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                  {CAMPOS_PRODUTO_NOVO.map((campo) => (
                    <View key={campo.key} style={styles.editField}>
                      <Text style={styles.editLabel}>{campo.label}</Text>
                      <TextInput
                        style={[
                          styles.editInput,
                          campo.multiline && styles.editInputMultiline,
                        ]}
                        value={dadosCriacao[campo.key] || ""}
                        onChangeText={(valor) =>
                          setDadosCriacao((atual) => ({
                            ...atual,
                            [campo.key]: valor,
                            ...(campo.key === "categoria_nome" ? { categoria_id: "" } : {}),
                          }))
                        }
                        keyboardType={campo.keyboardType || "default"}
                        multiline={campo.multiline}
                        editable={!aCriarRegisto}
                      />
                    </View>
                  ))}
                  <SeletorImagemPerfil
                    uri={imagemPerfil?.uri}
                    onPress={selecionarImagemPerfil}
                    disabled={aCriarRegisto}
                    titulo="Imagem do produto *"
                  />
                </>
              )}
              {tipoCriacao === "categoria" && (
                <>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Nome da categoria *</Text>
                    <TextInput
                      style={styles.editInput}
                      value={dadosCriacao.nome || ""}
                      onChangeText={(nome) =>
                        setDadosCriacao((atual) => ({ ...atual, nome }))
                      }
                      maxLength={120}
                      editable={!aCriarRegisto}
                      placeholder="Ex.: Medicamentos"
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Descrição (opcional)</Text>
                    <TextInput
                      style={[styles.editInput, styles.editInputMultiline]}
                      value={dadosCriacao.descricao || ""}
                      onChangeText={(descricao) =>
                        setDadosCriacao((atual) => ({ ...atual, descricao }))
                      }
                      maxLength={500}
                      multiline
                      editable={!aCriarRegisto}
                      placeholder="Descreve os produtos desta categoria."
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={() => setTipoCriacao(null)}
                disabled={aCriarRegisto}
              >
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditButton, aCriarRegisto && styles.submitDisabled]}
                onPress={criarRegisto}
                disabled={aCriarRegisto || aCarregarParceiros}
              >
                {aCriarRegisto ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveEditText}>Adicionar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  header: {
    backgroundColor: "#173B70",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: "#F5B91B", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  headerTitle: { color: "#FFFFFF", fontSize: 23, fontWeight: "900", marginTop: 5 },
  logoutButton: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF20",
  },
  navigation: { maxHeight: 62, backgroundColor: "#FFFFFF", flexGrow: 0 },
  navigationContent: { paddingHorizontal: 12, alignItems: "center", gap: 7 },
  navigationItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  navigationItemActive: { backgroundColor: "#FFF2D0" },
  navigationText: { color: "#667085", fontSize: 12, fontWeight: "700" },
  navigationTextActive: { color: "#173B70" },
  content: { flex: 1 },
  contentContainer: { padding: 18, paddingBottom: 40 },
  sectionTop: { marginBottom: 16 },
  sectionHeading: { color: "#173B70", fontSize: 20, fontWeight: "900" },
  sectionDescription: { color: "#667085", fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 15 },
  settingsCard: {
    marginBottom: 14,
    padding: 17,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    elevation: 1,
  },
  settingsHeading: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 5 },
  settingsIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#E8EEFF",
  },
  passwordSettingsIcon: { backgroundColor: "#FFF2DC" },
  settingsHeadingText: { flex: 1 },
  settingsTitle: { color: "#173B70", fontSize: 15, fontWeight: "900" },
  settingsSubtitle: { color: "#667085", fontSize: 12, marginTop: 3 },
  settingsReadOnlyInput: { backgroundColor: "#F2F4F7", color: "#667085" },
  settingsSaveButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 11,
    backgroundColor: "#173B70",
  },
  settingsSaveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  passwordHint: { color: "#667085", fontSize: 11, marginTop: 10 },
  settingsSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    padding: 12,
    borderRadius: 11,
    backgroundColor: "#E8F5EE",
  },
  settingsSuccessText: { flex: 1, color: "#16804A", fontSize: 12, fontWeight: "700" },
  addButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: "#173B70",
    marginBottom: 13,
  },
  addButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  summaryCard: {
    width: "48%", minHeight: 132, padding: 14, borderRadius: 17,
    backgroundColor: "#FFFFFF", elevation: 2,
  },
  summaryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryValue: { color: "#101828", fontSize: 24, fontWeight: "900", marginTop: 11 },
  summaryTitle: { color: "#667085", fontSize: 12, fontWeight: "700", marginTop: 3 },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    elevation: 1,
  },
  chartTitle: { color: "#173B70", fontSize: 14, fontWeight: "900" },
  chartPlot: {
    height: 160,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 8,
    marginTop: 12,
  },
  chartColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  chartValue: { maxWidth: "100%", color: "#667085", fontSize: 9, marginBottom: 5 },
  chartBarTrack: {
    width: "72%",
    height: "72%",
    justifyContent: "flex-end",
    overflow: "hidden",
    borderRadius: 7,
    backgroundColor: "#F2F4F7",
  },
  chartBar: { width: "100%", borderRadius: 7, minHeight: 0 },
  chartMonth: { color: "#667085", fontSize: 10, marginTop: 6, textTransform: "capitalize" },
  activeTrips: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", borderRadius: 15, padding: 15, marginTop: 14,
  },
  activeTripsText: { color: "#173B70", fontSize: 14, fontWeight: "800" },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E7EC",
    borderRadius: 13, paddingHorizontal: 12, minHeight: 48,
  },
  searchInput: { flex: 1, color: "#101828", fontSize: 14, paddingVertical: 10 },
  recordCard: { backgroundColor: "#FFFFFF", borderRadius: 17, padding: 14, marginBottom: 12, elevation: 1 },
  recordHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  recordImage: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#E9EEF5" },
  recordImagePlaceholder: {
    width: 48, height: 48, borderRadius: 15, backgroundColor: "#E9EEF5",
    alignItems: "center", justifyContent: "center",
  },
  recordInfo: { flex: 1 },
  recordName: { color: "#101828", fontSize: 14, fontWeight: "800" },
  recordSubtitle: { color: "#667085", fontSize: 12, marginTop: 4 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  statusActive: { backgroundColor: "#E8F5EE" },
  statusPending: { backgroundColor: "#FFF4DB" },
  statusText: { fontSize: 10, fontWeight: "800" },
  statusTextActive: { color: "#16804A" },
  statusTextPending: { color: "#A15C07" },
  recordDetails: { borderTopWidth: 1, borderTopColor: "#F0F2F5", marginTop: 12, paddingTop: 10 },
  recordDetail: { color: "#667085", fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 13 },
  actionButton: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 11 },
  approveButton: { backgroundColor: "#E8F5EE" },
  approveButtonText: { color: "#16804A", fontSize: 13, fontWeight: "900" },
  rejectButton: { backgroundColor: "#FEECEB" },
  rejectButtonText: { color: "#C4322B", fontSize: 13, fontWeight: "900" },
  recordActions: { flexDirection: "row", gap: 9, marginTop: 10 },
  recordActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 39,
    paddingHorizontal: 13,
    borderRadius: 10,
  },
  recordEditAction: { backgroundColor: "#E8EEFF" },
  recordEditActionText: { color: "#173B70", fontSize: 12, fontWeight: "900" },
  recordDeleteAction: { backgroundColor: "#FEECEB" },
  recordDeleteActionText: { color: "#B42318", fontSize: 12, fontWeight: "900" },
  managerSelfLabel: { color: "#173B70", fontSize: 12, fontWeight: "800", paddingVertical: 8 },
  managerInactiveLabel: { color: "#667085", fontSize: 12, fontWeight: "700", paddingVertical: 8 },
  productDeleteAction: { alignSelf: "flex-start", marginTop: 7 },
  textAction: { alignSelf: "flex-start", marginTop: 11, paddingVertical: 5 },
  textActionLabel: { color: "#173B70", fontSize: 12, fontWeight: "800" },
  productPrice: { color: "#173B70", fontSize: 14, fontWeight: "900", marginTop: 7 },
  editButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingRight: 8,
  },
  editButtonText: { color: "#173B70", fontSize: 12, fontWeight: "900" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 24, 40, 0.55)",
  },
  editModal: {
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 19,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  confirmBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    backgroundColor: "rgba(16, 24, 40, 0.6)",
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    padding: 22,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  confirmIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#FEECEB",
  },
  approvalConfirmIcon: { backgroundColor: "#E8F5EE" },
  confirmTitle: { color: "#101828", fontSize: 18, fontWeight: "900", marginTop: 14 },
  confirmMessage: { color: "#667085", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 9 },
  confirmName: { color: "#344054", fontWeight: "900" },
  confirmActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  confirmCancelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 11,
  },
  confirmCancelText: { color: "#344054", fontSize: 13, fontWeight: "800" },
  confirmDeleteButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#B42318",
  },
  approvalConfirmButton: { backgroundColor: "#16804A" },
  confirmDeleteText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  modalHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EAECF0",
  },
  modalTitleGroup: { flex: 1 },
  modalTitle: { color: "#173B70", fontSize: 19, fontWeight: "900" },
  modalSubtitle: { color: "#667085", fontSize: 12, marginTop: 4 },
  editFieldsScroll: { flexShrink: 1 },
  editField: { marginTop: 13 },
  editLabel: { color: "#344054", fontSize: 12, fontWeight: "800", marginBottom: 6 },
  editInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 11,
    color: "#101828",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },
  editInputMultiline: { minHeight: 76, textAlignVertical: "top" },
  optionList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FFFFFF",
  },
  optionChipSelected: { borderColor: "#173B70", backgroundColor: "#E8EEFF" },
  optionChipText: { color: "#475467", fontSize: 12, fontWeight: "700" },
  optionChipTextSelected: { color: "#173B70", fontWeight: "900" },
  selectedTypeNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
    padding: 11,
    borderRadius: 10,
    backgroundColor: "#E8EEFF",
  },
  selectedTypeText: { flex: 1, color: "#173B70", fontSize: 12, fontWeight: "700" },
  establishmentList: { gap: 7 },
  establishmentOption: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  establishmentOptionSelected: { borderColor: "#16804A", backgroundColor: "#F0F9F4" },
  establishmentOptionText: { flex: 1, color: "#344054", fontSize: 12, fontWeight: "700" },
  noEstablishmentText: { color: "#B54708", fontSize: 12, lineHeight: 18, padding: 10 },
  profileImagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 13,
    backgroundColor: "#F9FAFB",
  },
  profileImagePreview: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#E9EEF5",
  },
  profileImage: { width: "100%", height: "100%" },
  profileImageDescription: { flex: 1 },
  imageHint: { color: "#667085", fontSize: 11, marginTop: 3 },
  chooseImageButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    marginTop: 4,
  },
  chooseImageText: { color: "#173B70", fontSize: 12, fontWeight: "900" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 15 },
  cancelEditButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 11,
  },
  cancelEditText: { color: "#344054", fontSize: 13, fontWeight: "800" },
  saveEditButton: {
    flex: 1.4,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#173B70",
  },
  saveEditText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  loading: { marginTop: 45 },
  messageCard: {
    alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 16, padding: 22, marginTop: 12,
  },
  errorText: { color: "#B42318", fontSize: 13, textAlign: "center", marginTop: 8 },
  emptyText: { color: "#667085", fontSize: 13, marginTop: 9 },
  retryButton: { marginTop: 14, backgroundColor: "#173B70", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
