'use strict';


const dgram = require('dgram');
const Address = require('./address');
const Base = require('./base');
const net = require('net');


/**
 * Network server
 * @author Luis Blanco
 * @extends Base
 * @memberof RauNet
 */
class Server extends Base {
	
	constructor(protocol) {
		
		super(protocol);
		
		this._clients = [];
		this._clientsObj = {};
		this._frame = [];
	}
	
	handshake(socket, data) {
		console.log('SV GOT HANDSHAKE:', socket.name, data.toString());
		
		// Send a nice welcome message and announce
		this.decode(data, (err, msg) => {
			if (err) {
				return console.error(err);
			}
			
			// Correct handshake
			if (msg.identity === this.protocol.identity) {
				console.log('SV CLIENT ACCEPTED!');
				
				// Put this new client in the list
				this._clients.push(socket);
				this._clientsObj[socket.name] = socket;
				
				socket.on('data', (data) => {
					
					this.decode(data, (err, msg) => {
						if (err) {
							return console.error(err);
						}
						
						this.process(socket, msg);
					});
						
				});
				
				// Remove the client from the list when it leaves
				socket.on('end', () => {
					console.log('SV CLIENT LEFT:', socket.name);
					this._clients.splice(this._clients.indexOf(socket), 1);
					delete this._clientsObj[socket.name];
				});
			}
		});
		
		
	}
	
	
	process(socket, packet) {
		console.log('SV PROCESS MSG:', socket.name);
	}
	
	open(opts, cb) {
		
		this._address = opts.address || new Address('0.0.0.0', opts.port);
		
		this.serverTcp = net.createServer((socket) => {
			
			// Identify this client
			socket.name = socket.remoteAddress + ":" + socket.remotePort;
			console.log('SV GOT CLIENT:', socket.name);
			
			// Send a nice welcome message and announce
			this.encode({version: this.protocol.version}, (err, bytes) => {
				if (err) {
					return console.error(err);
				}
				socket.write(bytes);
			});
			
			
			// Listen to handshake
			socket.once('data', (data) => { this.handshake(socket, data); });
			
		});
		
		this.serverTcp.on('error', (err) => {
			// handle errors here
			throw err;
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
		
		this.serverUdp = dgram.createSocket({type:'udp4', reuseAddr: true});
		
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
	
	
	weak() {
		
		if ( ! this._frame.length ) {
			return;
		}
		
		this.encode(this._frame, (err, data) => {
			this._clients.forEach((socket) => {
				this.serverUdp.send(data, 0, data.length, socket.remotePort + 1, socket.remoteAddress);
			});
		});
		
		this._frame = [];
		
	}
	
	
	strong(msg) {
		this.encode(msg, (err, data) => {
			this._clients.forEach((socket) => {
				socket.write(data);
			});
		});
	}
	
	
	send(id, msg) {
		if (this.protocol.getChannel(id) === 'tcp') {
			const packet = {};
			packet[id] = msg;
			this.strong(packet);
		} else {
			this._frame[id] = msg;
		}
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
