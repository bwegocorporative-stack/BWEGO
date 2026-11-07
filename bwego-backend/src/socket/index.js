
const usuariosSocket = require('./usuariosSocket');
const motoristasSocket = require('./motoristasSocket');
const viagensSocket = require('./viagensSocket');
const entregasSocket = require('./entregasSocket');
const pedidosSocket = require('./pedidosSocket');
const notificacoesSocket = require('./notificacoesSocket');

function configurarSockets(io) {
    io.on('connection', (socket) => {
        console.log('Cliente conectado:', socket.id);

        usuariosSocket(io, socket);
        motoristasSocket(io, socket);
        viagensSocket(io, socket);
        entregasSocket(io, socket);
        pedidosSocket(io, socket);
        notificacoesSocket(io, socket);

        socket.on('disconnect', () => {
            console.log('Cliente desconectado:', socket.id);
        });
    });
}

module.exports = configurarSockets;
