
/**
 * BWÉ GO
 * UTILITÁRIO: CALCULAR DISTÂNCIA GPS
 *
 * Calcula a distância entre dois pontos geográficos
 * utilizando a fórmula de Haversine.
 *
 * Retorna a distância em quilómetros.
 */

function calcularDistancia(lat1, lon1, lat2, lon2) {

    // Validar coordenadas
    const coordenadas = [lat1, lon1, lat2, lon2];

    if (
        coordenadas.some(
            valor => valor === null ||
                     valor === undefined ||
                     valor === '' ||
                     !Number.isFinite(Number(valor))
        )
    ) {
        throw new Error('Coordenadas GPS inválidas.');
    }

    // Converter para números
    lat1 = Number(lat1);
    lon1 = Number(lon1);
    lat2 = Number(lat2);
    lon2 = Number(lon2);

    // Validar limites geográficos
    if (
        lat1 < -90 || lat1 > 90 ||
        lat2 < -90 || lat2 > 90 ||
        lon1 < -180 || lon1 > 180 ||
        lon2 < -180 || lon2 > 180
    ) {
        throw new Error('Coordenadas fora dos limites geográficos.');
    }

    // Raio médio da Terra em quilómetros
    const RAIO_TERRA = 6371;

    // Converter graus para radianos
    const paraRadiano = graus => graus * Math.PI / 180;

    const diferencaLatitude = paraRadiano(lat2 - lat1);
    const diferencaLongitude = paraRadiano(lon2 - lon1);

    // Fórmula de Haversine
    const a =
        Math.sin(diferencaLatitude / 2) ** 2 +
        Math.cos(paraRadiano(lat1)) *
        Math.cos(paraRadiano(lat2)) *
        Math.sin(diferencaLongitude / 2) ** 2;

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    const distancia = RAIO_TERRA * c;

    return Number(distancia.toFixed(2));
}

module.exports = calcularDistancia;
