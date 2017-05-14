'use strict';


const dgram = require('dgram');
const net   = require('net');

const Channel  = require('./lib/channel');
const Binary = require('./lib/binary');


/**
 * Network client
 * @author Luis Blanco
 * @extends MpAct
 */
class Client extends Channel {
	
	get id() { return this._id; }
	
	constructor(protocol) {
		
		super(protocol);
		
		this._id = null;
		this._cb = ()=>{};
		
		this._client = null;
		this._remote = null;
		this._port   = null;
		
		// Prepare a binary buffer with client's identity
		this._respondBinary = new Binary();
		this._respondBinary.pushUint16(0);
		this._respondBinary.pushString(this.protocol.identity);
		this._respondBinary.pos = 0;
		this._respondBinary.pushUint16(this._respondBinary.size);
		
		// Prepare a binary buffer for echo
		this._echoBuffer = new Buffer(`mpact-bcast-ping-${this._protocol.identity}`);
		this._echoRegex = /^mpact\-bcast\-pong\-/;
		
		// Prepare echo socket
		this._echo = dgram.createSocket({type:'udp4', reuseAddr: true});
		this._echoPort = 27932;
		this._echoServers = [];
		
		this._echoActive  = null;
		this._echoPrev    = null;
		this._echoTimeout = 2000;
		this._echoTotal   = 10000;
		
		this._echoTotalTimer = null;
		this._echoTimeoutTimer = null;
		
		this._echo.on('message', (data, remote) => {
			
			// console.log('CL GOT ECHO:', this._echoActive, data.toString());
			
			if ( ! this._echoActive ) {
				console.warn('ECHO ALREADY INACTIVE!');
				return;
			}
			
			this._echoPrev = Date.now();
			
			const pong = data.toString();
			// Compare and respond only to the same protocol
			if (this._echoRegex.test(pong)) {
				const port = parseInt(pong.replace(this._echoRegex, ''));
				if (port) {
					
					const server = { host: remote.address, port };
					this._echoServers.push(server);
					this.emit('server', server);
					
				}
			}
			
		});
		
		this._echo.bind();
		this._echo.on('listening', () => this._echo.setBroadcast(true));
		
		this._time = null;
		
	}
	
	open(opts, cb) {
		
		if ( ! opts.remote ) {
			return;
		}
		
		this._stopEcho();
		
		this._cb = cb;
		
		this._remote = opts.remote;
		
		this._client = net.createConnection(this._remote, () => {
				
				this._port = this._client.address().port;
				this.initSocket(this._client);
				
				super.open(Object.assign({}, opts, { port: this._port }), err => {
					if (err) {
						this._cb(err);
						this._cb = ()=>{};
					}
				});
				
			}
		);
		
	}
	
	
	handshake(binary, socket) {
		
		// console.log('CL GOT HANDSHAKE:', socket.name, binary.size, binary.toBuffer());
		
		binary.pos = 2;
		const version = binary.pullString();
		
		// console.log('CL VPULLED', version);
		
		// Version check
		if (version === this.protocol.version) {
			// console.log('CL HANDSHAKE OK');
			socket.writeTcp(this._respondBinary);
			
			// Next packet should contain an ID
			socket.once('packet', binary => {
				
				binary.pos = 2;
				socket.id = binary.pullUint8();
				this._id = socket.id;
				
				this._time = binary.pullUint16();
				
				// console.log('CLIENT GOT ID:', socket.id);
				this.addSocket(socket);
				
				this._cb();
				this._cb = ()=>{};
				
			});
			
		} else {
			this._cb(new Error('Wrong server version.'));
			this._cb = ()=>{};
		}
		
	}
	
	
	getTime() {
		return Date.now() & 0xFFFF;
	}
	
	
	close(cb) {
		this._cb = ()=>{};
		this._remote = null;
		this._client = null;
		this._port   = null;
		super.close(cb);
	}
	
	
	// Actions that came from the network
	emitActions(binary, socket) {
		
		this._readPacket(binary, socket).forEach(action => {
			
			if (action.type === '__SVC') {
				// console.log('CL GOT SVC:', action.data);
				return this._execService(action.data);
			}
			
			// Only "server" actions can be consumed by the server
			if ( ! this._protocol.isClient[action.type] ) {
				this.emit('action', action);
			}
		});
		
	}
	
	
	_execService(data) {
		
		switch(data.e) {
			
			case 'join':
				const joined = this.initUser(data.i);
				this.addUser(joined);
				this.emit('join', joined);
				break;
				
			case 'drop':
				const dropped = this._users[data.i];
				this.remUser(dropped);
				this.emit('drop', dropped);
				break;
				
			case 'ping':
			console.log('GOT PINGS',data);
				
				// Apply
				this._time = data.t;
				
				const exist = {};
				
				data.p.forEach(p => {
					
					const user = this._users[p.i];
					
					if (user) {
						// If user exists, then set his ping
						user.ping = p.p;
					} else {
						console.log('NEW USER', p);
						// Else create a new one
						const joined = this.initUser(p.i);
						this.addUser(joined);
						this.emit('join', joined);
					}
					
					exist[user.id] = true;
					
				});
				
				this._ulist.slice().forEach(u => {
					if ( ! exist[u.id] ) {
						console.log('REM USER', u);
						// Else create a new one
						this.remUser(u);
						this.emit('drop', u);
					}
				});
				
				// Respond
				this._udpOutPacket.push({
					type: '__SVC',
					data: {
						e: 'pong',
						t: this._time,
					},
				});
				break;
				
			default: break;
			
		}
		
	}
	
	
	// Propagate an action through the network
	dispatch(action) {
		
		// Only client actions are allowed to be sent by the server
		if ( this._protocol.isClient[action.type]) {
			super.dispatch(action);
		}
		
	}
	
	
	_stopEcho() {
		
		if (this._echoActive === false) {
			return;
		}
		
		this._echoActive = false;
		this._echoPrev = null;
		
		clearTimeout(this._echoTotalTimer);
		this._echoTotalTimer = null;
		
		clearInterval(this._echoTimeoutTimer);
		this._echoTimeoutTimer = null;
		
		this._echoCb(null, this._echoServers);
		this._echoCb = ()=>{};
		
	}
	
	_checkEcho() {
		if (Date.now() - this._echoPrev > this._echoTimeout) {
			this._stopEcho();
		}
	}
	
	localServers(cb) {
		
		this._echoCb = cb;
		this._echoServers = [];
		this._echoActive = true;
		this._echoPrev = Date.now();
		
		// console.log('CL SEND ECHO:', this._echoBuffer.toString());
		this._echo.send(this._echoBuffer, 0, this._echoBuffer.length, this._echoPort, '255.255.255.255');
		
		this._echoTotalTimer = setTimeout(this._stopEcho.bind(this), this._echoTotal);
		this._echoTimeoutTimer = setInterval(this._checkEcho.bind(this), this._echoTimeout);
		
		
	}
	
}

module.exports = Client;
