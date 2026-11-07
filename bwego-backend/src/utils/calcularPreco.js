
/**
 * BWÉ GO
 * UTILITÁRIO: CALCULAR PREÇO
 *
 * Calcula o preço de viagens e entregas.
 * Moeda: Kwanza (AOA / Kz).
 */

const calcularPreco = ({
    distanciaKm = 0,
    tarifaBase = 0,
    precoPorKm = 0,
    taxaServico = 0,
    taxaAdicional = 0,
    desconto = 0,
    precoMinimo = 0
} = {}) => {

    // Validar valores
    const valores = {
        distanciaKm,
        tarifaBase,
        precoPorKm,
        taxaServico,
        taxaAdicional,
        desconto,
        precoMinimo
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

    // Calcular preço da distância
    const precoDistancia = distanciaKm * precoPorKm;

    // Subtotal
    const subtotal = tarifaBase + precoDistancia + taxaAdicional;

    // Taxa de serviço em percentagem
    const valorTaxaServico = subtotal * (taxaServico / 100);

    // Total antes do desconto
    const totalAntesDesconto = subtotal + valorTaxaServico;

    // Aplicar desconto
    const valorDesconto = totalAntesDesconto * (desconto / 100);

    let total = totalAntesDesconto - valorDesconto;

    // Aplicar preço mínimo
    total = Math.max(total, precoMinimo);

    // Arredondar para duas casas decimais
    total = Number(total.toFixed(2));

    return {
        distanciaKm,
        tarifaBase,
        precoDistancia: Number(precoDistancia.toFixed(2)),
        taxaAdicional,
        subtotal: Number(subtotal.toFixed(2)),
        taxaServico: Number(valorTaxaServico.toFixed(2)),
        desconto: Number(valorDesconto.toFixed(2)),
        precoFinal: total,
        moeda: 'AOA'
    };
};

module.exports = calcularPreco;
