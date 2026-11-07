
/**
 * BWÉ GO
 * UTILITÁRIO: CALCULAR TAXAS E COMISSÕES
 *
 * Calcula:
 * - Comissão da plataforma
 * - Comissão do parceiro
 * - Comissão do motorista
 * - Taxas adicionais
 * - Valor líquido a receber
 *
 * Moeda: Kwanza (AOA)
 */

function calcularTaxa({
    valorTotal = 0,

    taxaPlataforma = 0,
    taxaParceiro = 0,
    taxaMotorista = 0,

    taxaAdicional = 0,

    tipoCalculo = 'percentagem'
} = {}) {

    // Validar valores
    const valores = {
        valorTotal,
        taxaPlataforma,
        taxaParceiro,
        taxaMotorista,
        taxaAdicional
    };

    for (const [campo, valor] of Object.entries(valores)) {
        if (
            typeof valor !== 'number' ||
            !Number.isFinite(valor) ||
            valor < 0
        ) {
            throw new Error(`Valor inválido no campo: ${campo}`);
        }
    }

    if (valorTotal <= 0) {
        throw new Error('O valor total deve ser superior a zero.');
    }

    if (
        !['percentagem', 'fixo'].includes(tipoCalculo)
    ) {
        throw new Error('Tipo de cálculo inválido.');
    }

    if (
        tipoCalculo === 'percentagem' &&
        (
            taxaPlataforma > 100 ||
            taxaParceiro > 100 ||
            taxaMotorista > 100
        )
    ) {
        throw new Error('As taxas percentuais não podem ultrapassar 100%.');
    }

    // Função de cálculo
    const calcularValor = (taxa) => {

        if (tipoCalculo === 'percentagem') {
            return valorTotal * (taxa / 100);
        }

        return taxa;
    };

    // Calcular comissões
    const valorPlataforma = calcularValor(taxaPlataforma);
    const valorParceiro = calcularValor(taxaParceiro);
    const valorMotorista = calcularValor(taxaMotorista);

    // Total das comissões
    const totalComissoes =
        valorPlataforma +
        valorParceiro +
        valorMotorista;

    // Verificar se as comissões ultrapassam o valor total
    if (totalComissoes + taxaAdicional > valorTotal) {
        throw new Error(
            'As taxas e comissões ultrapassam o valor total.'
        );
    }

    // Valor líquido
    const valorLiquido =
        valorTotal -
        totalComissoes -
        taxaAdicional;

    // Arredondamento
    const arredondar = valor =>
        Number(valor.toFixed(2));

    return {

        valorTotal: arredondar(valorTotal),

        plataforma: {
            taxa: taxaPlataforma,
            valor: arredondar(valorPlataforma)
        },

        parceiro: {
            taxa: taxaParceiro,
            valor: arredondar(valorParceiro)
        },

        motorista: {
            taxa: taxaMotorista,
            valor: arredondar(valorMotorista)
        },

        taxaAdicional: arredondar(taxaAdicional),

        totalComissoes: arredondar(totalComissoes),

        valorLiquido: arredondar(valorLiquido),

        moeda: 'AOA'
    };
}

module.exports = calcularTaxa;
