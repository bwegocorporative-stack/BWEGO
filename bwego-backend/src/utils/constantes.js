
/**
 * BWÉ GO
 * UTILITÁRIO: CONSTANTES GLOBAIS
 *
 * Centraliza estados, tipos, permissões
 * e configurações utilizadas no backend.
 */

const CONSTANTES = {

    // =====================================
    // CONFIGURAÇÕES GERAIS
    // =====================================

    APP: {
        NOME: 'BWÉ GO',
        VERSAO: '1.0.0',
        MOEDA: 'AOA',
        SIMBOLO_MOEDA: 'Kz',
        PAIS: 'Angola',
        CODIGO_PAIS: 'AO',
        CODIGO_TELEFONE: '+244'
    },

    // =====================================
    // TIPOS DE UTILIZADORES
    // =====================================

    TIPOS_USUARIO: {
        ADMIN: 'admin',
        CLIENTE: 'cliente',
        MOTORISTA: 'motorista',
        PARCEIRO: 'parceiro',
        OPERADOR: 'operador'
    },

    // =====================================
    // ESTADOS DOS UTILIZADORES
    // =====================================

    ESTADOS_USUARIO: {
        ATIVO: 'ativo',
        INATIVO: 'inativo',
        BLOQUEADO: 'bloqueado',
        PENDENTE: 'pendente'
    },

    // =====================================
    // ESTADOS DOS MOTORISTAS
    // =====================================

    ESTADOS_MOTORISTA: {
        DISPONIVEL: 'disponivel',
        INDISPONIVEL: 'indisponivel',
        EM_VIAGEM: 'em_viagem',
        SUSPENSO: 'suspenso'
    },

    // =====================================
    // ESTADOS DAS VIAGENS
    // =====================================

    ESTADOS_VIAGEM: {
        PENDENTE: 'pendente',
        ACEITE: 'aceite',
        MOTORISTA_A_CAMINHO: 'motorista_a_caminho',
        MOTORISTA_CHEGOU: 'motorista_chegou',
        EM_ANDAMENTO: 'em_andamento',
        CONCLUIDA: 'concluida',
        CANCELADA: 'cancelada'
    },

    // =====================================
    // TIPOS DE VIAGENS
    // =====================================

    TIPOS_VIAGEM: {
        PARTICULAR: 'particular',
        COMPARTILHADA: 'compartilhada',
        AGENDADA: 'agendada'
    },

    // =====================================
    // ESTADOS DAS ENTREGAS
    // =====================================

    ESTADOS_ENTREGA: {
        PENDENTE: 'pendente',
        ACEITE: 'aceite',
        PREPARANDO: 'preparando',
        PRONTA: 'pronta',
        MOTORISTA_A_CAMINHO: 'motorista_a_caminho',
        EM_TRANSITO: 'em_transito',
        ENTREGUE: 'entregue',
        CANCELADA: 'cancelada'
    },

    // =====================================
    // ESTADOS DOS PEDIDOS
    // =====================================

    ESTADOS_PEDIDO: {
        PENDENTE: 'pendente',
        CONFIRMADO: 'confirmado',
        EM_PREPARACAO: 'em_preparacao',
        PRONTO: 'pronto',
        EM_ENTREGA: 'em_entrega',
        ENTREGUE: 'entregue',
        CANCELADO: 'cancelado'
    },

    // =====================================
    // ESTADOS DOS PAGAMENTOS
    // =====================================

    ESTADOS_PAGAMENTO: {
        PENDENTE: 'pendente',
        PROCESSANDO: 'processando',
        PAGO: 'pago',
        FALHOU: 'falhou',
        CANCELADO: 'cancelado',
        REEMBOLSADO: 'reembolsado'
    },

    // =====================================
    // MÉTODOS DE PAGAMENTO
    // =====================================

    METODOS_PAGAMENTO: {
        DINHEIRO: 'dinheiro',
        MULTICAIXA: 'multicaixa',
        TRANSFERENCIA: 'transferencia',
        REFERENCIA: 'referencia',
        CARTEIRA: 'carteira'
    },

    // =====================================
    // ESTADOS DOS PARCEIROS
    // =====================================

    ESTADOS_PARCEIRO: {
        PENDENTE: 'pendente',
        ATIVO: 'ativo',
        INATIVO: 'inativo',
        SUSPENSO: 'suspenso'
    },

    // =====================================
    // ESTADOS DOS PRODUTOS
    // =====================================

    ESTADOS_PRODUTO: {
        DISPONIVEL: 'disponivel',
        INDISPONIVEL: 'indisponivel',
        ESGOTADO: 'esgotado',
        INATIVO: 'inativo'
    },

    // =====================================
    // TIPOS DE PARCEIROS
    // =====================================

    TIPOS_PARCEIRO: {
        RESTAURANTE: 'restaurante',
        SUPERMERCADO: 'supermercado',
        FARMACIA: 'farmacia',
        LOJA: 'loja',
        OUTRO: 'outro'
    },

    // =====================================
    // TIPOS DE NOTIFICAÇÕES
    // =====================================

    TIPOS_NOTIFICACAO: {
        PEDIDO: 'pedido',
        VIAGEM: 'viagem',
        ENTREGA: 'entrega',
        PAGAMENTO: 'pagamento',
        SISTEMA: 'sistema',
        PROMOCAO: 'promocao'
    },

    // =====================================
    // ESTADOS DAS NOTIFICAÇÕES
    // =====================================

    ESTADOS_NOTIFICACAO: {
        NAO_LIDA: 'nao_lida',
        LIDA: 'lida'
    },

    // =====================================
    // PERMISSÕES
    // =====================================

    PERMISSOES: {
        ADMIN: 'admin',
        GERIR_USUARIOS: 'gerir_usuarios',
        GERIR_MOTORISTAS: 'gerir_motoristas',
        GERIR_PARCEIROS: 'gerir_parceiros',
        GERIR_PRODUTOS: 'gerir_produtos',
        GERIR_PEDIDOS: 'gerir_pedidos',
        GERIR_VIAGENS: 'gerir_viagens',
        GERIR_ENTREGAS: 'gerir_entregas',
        GERIR_PAGAMENTOS: 'gerir_pagamentos',
        VER_RELATORIOS: 'ver_relatorios'
    },

    // =====================================
    // LIMITES E CONFIGURAÇÕES
    // =====================================

    LIMITES: {
        TAMANHO_MAXIMO_IMAGEM: 5 * 1024 * 1024,
        MAXIMO_IMAGENS: 10,
        LIMITE_PAGINACAO: 50,
        PAGINACAO_PADRAO: 10,
        TENTATIVAS_LOGIN: 5
    },

    // =====================================
    // EVENTOS SOCKET.IO
    // =====================================

    SOCKET: {
        USUARIO_CONECTADO: 'usuario:conectado',
        MOTORISTA_CONECTADO: 'motorista:conectado',

        PEDIDO_ATUALIZADO: 'pedido:atualizado',
        VIAGEM_ATUALIZADA: 'viagem:atualizada',
        ENTREGA_ATUALIZADA: 'entrega:atualizada',

        MOTORISTA_LOCALIZACAO: 'motorista:localizacao',
        MOTORISTA_LOCALIZACAO_ATUALIZADA: 'motorista:localizacao-atualizada',

        NOTIFICACAO_NOVA: 'notificacao:nova'
    }

};

// Exportar constantes
module.exports = CONSTANTES;
