'use strict';

const dgram = require('dgram');
const Address = require('./address');
const DuoSocket = require('./duo-socket');
const MpAct = require('./mpact');
const net = require('net');


/**
 * Network server
 * @author Luis Blanco
 * @extends MpAct
 */
class Server extends MpAct {
	
	
	constructor(protocol) {
		
		super(protocol);
		
	}
	
	
	dispatch(action) {
		
		if ( ! this._protocol.isClient[action.type]) {
			super.dispatch(action);
		}
		
	}
	
	
	handshake(socket, binary) {
		console.log('SV GOT HANDSHAKE:', socket.name);
		
		const identity = binary.pullString();
		
		// Correct handshake
		if (identity === this._protocol.identity) {
			console.log('SV CLIENT ACCEPTED!');
			
			this.pushSocket(socket);
			
		} else {
			socket.destroy();
		}
		
	}
	
	
	emitActions(binary) {
		this._readPacket(binary).forEach(action => {
			if ( this._protocol.isClient[action.type] ) {
				this.emit('action', action);
			}
		});
	}
	
	
	open(opts, cb) {
		
		this._address = opts.address || new Address('0.0.0.0', opts.port);
		this.serverUdp = dgram.createSocket({type:'udp4', reuseAddr: true});
		
		this.serverTcp = net.createServer(tcp => {
			
			const socket = new DuoSocket(tcp);
			console.log('SV GOT CLIENT:', socket.name);
			
			// Listen to handshake
			socket.once('packet', binary => this.handshake(socket, binary));
			
			this.encode({version: this.protocol.version}, socket.sending);
			socket.send();
			
		});
		
		this.serverTcp.on('error', (err) => {
			console.error('Error', err);
		});
		
		// grab a random port.
		this.serverTcp.listen(
			{
				host: '0.0.0.0',
				port: this._address.port,
				exclusive: /*opts.exclusive || */true,
			},
			() => {
				console.log('TCP server-listener:', this.serverTcp.address());
				
			}
		);
		
		
		
		this.serverUdp.on('listening', () => {
			const address = this.serverUdp.address();
			console.log('UDP server-listener:' + address.address + ":" + address.port);
			
			setInterval(() => {
				this.weak();
			}, 50);
			
			this.bcl(()=>{super.open(cb);});
		});
		
		this.serverUdp.on('message', (data, remote) => {
			console.log(remote.address + ':' + remote.port +' - ' + data);
			
			const socket = this._clientsObj[remote.address + ':' + (remote.port + 1)];
			
			if (socket) {
				
				console.log('SV UDP msg:' + remote.address + ":" + remote.port);
				
				// Send a nice welcome message and announce
				this.decode(data, (err, msg) => {
					if (err) {
						return console.error(err);
					}
					this.process(socket, msg);
				});
				
			} else {
				console.log('SV UDP unknown:' + remote.address + ":" + remote.port);
			}
			
		});
		console.log('SV UDP PORT:', this._address.port + 1);
		this.serverUdp.bind({port:this._address.port + 1, address:'0.0.0.0', exclusive: true});
		
		
		
	}
	
	
	close(cb) {
		
		super.close(cb);
		
	}
	
	bcl(cb) {
		
		this.bcastMsg = new Buffer('bcast-pong' + this._address.port);
		
		this.udpBcaster = dgram.createSocket({type:'udp4', reuseAddr: true});
		
		this.udpBcaster.on('listening', () => {
			const address = this.udpBcaster.address();
			console.log('UDP bcast-server:', address.address + ':' + address.port);
			cb();
		});
		
		this.udpBcaster.on('message', (message, remote) => {
			console.log('UDP bcast-req:', remote.address + ':' + remote.port, message.toString());
			
			if (/^bcast\-ping$/.test(message.toString())) {
				this.udpBcaster.send(this.bcastMsg, 0, this.bcastMsg.length, remote.port, remote.address);
			}
			
		});
		
		this.udpBcaster.bind({ port:27932, host:'0.0.0.0' });
		
	}
	
}

module.exports = Server;
