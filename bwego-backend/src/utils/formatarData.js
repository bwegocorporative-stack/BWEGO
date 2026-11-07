
/**
 * BWÉ GO
 * UTILITÁRIO: FORMATAR DATAS E HORAS
 *
 * Fuso horário: Angola (Africa/Luanda)
 * Formato de data: DD/MM/YYYY
 * Formato de hora: HH:mm
 */

const TIME_ZONE = 'Africa/Luanda';

// Validar e converter uma data
function validarData(data) {

    if (data === null || data === undefined || data === '') {
        throw new Error('A data é obrigatória.');
    }

    const dataConvertida = data instanceof Date
        ? data
        : new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        throw new Error('Data inválida.');
    }

    return dataConvertida;
}

// Formatar apenas a data
function formatarData(data) {

    const dataConvertida = validarData(data);

    return new Intl.DateTimeFormat('pt-AO', {
        timeZone: TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(dataConvertida);
}

// Formatar apenas a hora
function formatarHora(data) {

    const dataConvertida = validarData(data);

    return new Intl.DateTimeFormat('pt-AO', {
        timeZone: TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).format(dataConvertida);
}

// Formatar data e hora
function formatarDataHora(data) {

    const dataConvertida = validarData(data);

    return new Intl.DateTimeFormat('pt-AO', {
        timeZone: TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).format(dataConvertida);
}

// Formatar data por extenso
function formatarDataExtenso(data) {

    const dataConvertida = validarData(data);

    return new Intl.DateTimeFormat('pt-AO', {
        timeZone: TIME_ZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(dataConvertida);
}

// Formatar data para o banco de dados MySQL
function formatarDataMySQL(data) {

    const dataConvertida = validarData(data);

    const partes = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(dataConvertida);

    const valores = {};

    partes.forEach(parte => {
        if (parte.type !== 'literal') {
            valores[parte.type] = parte.value;
        }
    });

    return `${valores.year}-${valores.month}-${valores.day}`;
}

// Formatar data e hora para MySQL
function formatarDataHoraMySQL(data) {

    const dataConvertida = validarData(data);

    const partes = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(dataConvertida);

    const valores = {};

    partes.forEach(parte => {
        if (parte.type !== 'literal') {
            valores[parte.type] = parte.value;
        }
    });

    return `${valores.year}-${valores.month}-${valores.day} ${valores.hour}:${valores.minute}:${valores.second}`;
}

// Exportar funções
module.exports = {
    formatarData,
    formatarHora,
    formatarDataHora,
    formatarDataExtenso,
    formatarDataMySQL,
    formatarDataHoraMySQL
};
