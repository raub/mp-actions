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
		
		
		
	}
	
	
	// Game simulation routine, advances game logic by given delta-time
	simulate(dt) {
		
		// First update local player state
		this._updatePlayer();
		
		// Then update (predict) everybody
		this.state.plist.forEach(player => {
			const vx = dt * ( (player.control.right?1:0) - (player.control.left?1:0) );
			this.apply({ type: 'SV_X', data: { x: player.x + vx, id: player.id } });
			this.apply({ type: 'SV_CONTROL', data: { id: player.id, control: player.control } });
		});
		
	}
	
	
	// Private version of dispatch with event emission
	apply(action) {
		this.dispatch(action);
		this.emit('action', action);
	}
	
	
	// For join event
	join(id) {
		console.log('JOINED:', id);
		this.dispatch({ type: 'ADD_PLAYER', data: id });
	}
	
	
	// For drop event
	drop(id) {
		console.log('DROPED:', id);
		this.dispatch({ type: 'REM_PLAYER', data: id });
	}
	
	// Action processor
	dispatch(action) {
		
		switch(action.type) {
			
			case 'ADD_PLAYER':
				// TODO: make a class maybe? or even two...
				const player = {
					id: action.data,
					x : 0,
					y : 0,
					settings: {},
					control : new Control(),
				};
				
				this.state.players[action.data] = player;
				this.state.plist.push(player);
				
				if (this.state.id === action.data) {
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
				delete this.state.players[action.data];
				this.state.plist = this.state.playerlist.filter(p => p.id !== action.data);
				if (this.state.id === action.data) {
					this._updatePlayer = ()=>{};
				}
				break;
				
			// Controls data FROM client - resent by server
			case 'CL_CONTROL':
				console.log('CLC', action);
				if (action.clid !== undefined) {
					// Serverside: transmit to all other clients
					// this.apply({ type: 'SV_CONTROL', data: { id: action.clid, control: action.data } });
					console.log('GOT CTL FOR', action.clid, action.data);
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
				this.state.players[action.data.id].control.fromArray(action.data.control);
				break;
				
			case 'SV_X':
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
