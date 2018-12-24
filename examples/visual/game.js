'use strict';

const EventEmitter = require('events');

const Control = require('./control');


class Game extends EventEmitter {
	
	
	// Prepare game data, might be server or client
	constructor(opts) {
		
		super();
		
		opts = opts || {};
		
		console.log('CL OPTS ID', opts.id);
		this.state = {
			id     : opts.id, // undefined for server
			avx    : 0,
			avy    : 0,
			players: {}, // for random access
			plist  : [], // for iteration
		};
		
		// Updates local-player-local-data, controls usually. But no player yet
		this._updatePlayer = ()=>{};
		
		// Game simulation with timing
		this.prevTime = Date.now();
		this.timer = setInterval(() => {
			
			// Use delta time to do physics
			const nextTime = Date.now();
			const dt = nextTime - this.prevTime;
			this.prevTime = nextTime;
			
			// Actually simulate game
			this.simulate(dt);
			
		}, 16);
		
		this._headless = opts.headless;
		if ( ! this._headless ) {
			console.log('game.js', '---------- NOT HEADLESS');
			const { Screen }  = require('3d-core-raub');
			this.screen = new Screen();
		}
		
	}
	
	
	// Game simulation routine, advances game logic by given delta-time
	simulate(dt) {
		
		// First update local player state
		this._updatePlayer();
		
		// Then update (predict) everybody
		this.state.plist.forEach(player => {
			const vx = dt * ( (player.control.right?1:0) - (player.control.left?1:0) );
			// console.log('game.js', 'xx', player.x, vx);
			this.apply({ type: 'SV_X', data: { x: player.x + vx, id: player.id } });
			this.apply({ type: 'SV_CONTROL', data: { id: player.id, control: player.control.toArray() } });
			if ( ! this._headless ) {
				player.rect.pos = [player.x, 0];
			}
		});
		
		if ( ! this._headless ) {
			const { doc }  = require('3d-core-raub');
			doc.requestAnimationFrame(() => this.screen.draw());
		}
		
	}
	
	
	// Private version of dispatch with event emission
	apply(action) {
		this.dispatch(action);
		this.emit('action', action);
	}
	
	
	// For join event
	join(user) {
		console.log('JOINED:', user, '@', this.state.id);
		this.dispatch({ type: 'ADD_PLAYER', data: user });
	}
	
	
	// For drop event
	drop(user) {
		console.log('DROPED:', user);
		this.dispatch({ type: 'REM_PLAYER', data: user });
	}
	
	noPlayer(id) {
		return ! this.state.players[id];
	}
	
	// Action processor
	dispatch(action) {
		
		switch(action.type) {
			
			case 'ADD_PLAYER':
			// console.log('ADDP', action);
				// TODO: make a class maybe? or even two...
				const player = {
					id: action.data.id,
					user: action.data,
					x : 0,
					y : 0,
					settings: {},
					control : new Control(),
				};
				
				if ( ! this._headless ) {
					const { Rect }  = require('3d-core-raub');
					console.log('game.js', 'RECT', this.state.id, player.id);
					player.rect = new Rect({ screen: this.screen });
					player.rect.mat.color = [
						Math.random(),
						Math.random(),
						Math.random(),
					];
					player.rect.size = [100, 100];
				}
				
				this.state.players[action.data.id] = player;
				this.state.plist.push(player);
				// console.log('game.js', 'PLAYOR', this.state.id, player.id);
				if (this.state.id === player.id) {
					this._updatePlayer = function () {
						player.control.fetch();
						if (player.control.quit) {
							this.emit('quit');
						}
						this.apply({ type: 'CL_CONTROL', data: player.control.toArray() });
					};
				}
				
				break;
				
			case 'REM_PLAYER':
				delete this.state.players[action.data.id];
				this.state.plist = this.state.plist.filter(p => p.id !== action.data.id);
				if (this.state.id === action.data.id) {
					this._updatePlayer = ()=>{};
				}
				break;
				
			// Controls data FROM client - resent by server
			case 'CL_CONTROL':
				if (action.clid !== undefined) {
					// Serverside: transmit to all other clients
					// this.apply({ type: 'SV_CONTROL', data: { id: action.clid, control: action.data } });
					// console.log('SV GOT CTL FOR', action.clid, action.data);
					this.state.players[action.clid].control.fromArray(action.data);
				} else {
					// Clientside: apply immediately
					// console.log('this.state.id', this.state.id);
					this.state.players[this.state.id].control.fromArray(action.data);
				}
				
				break;
				
			// Controls data FROM server - apply state change
			case 'SV_CONTROL':
				// Do not apply to self
				if (this.state.id === action.data.id) {
					break;
				}
				if (this.noPlayer(action.data.id)) {
					break;
				}
				this.state.players[action.data.id].control.fromArray(action.data.control);
				break;
				
			case 'SV_X':
				if (this.noPlayer(action.data.id)) {
					break;
				}
			// console.log('1',action.data, action.clid, this.state.players);
				this.state.players[action.data.id].x = action.data.x;
				this.state.players[action.data.id].y = Math.sin(action.data.x);
				break;
				
			// Chat message FROM client - resent by server
			case 'CL_CHAT':
				if (action.clid !== undefined) {
					this.apply({ type: 'SV_CHAT', data: { id: action.clid, control: action.data } });
				}
				break;
				
			case 'SV_CHAT':
				console.log('CHAT:', action.data.id, action.data.text);
				break;
				
			default: break;
			
		}
		
	}
	
}

module.exports = Game;
