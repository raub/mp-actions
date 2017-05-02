'use strict';

const EventEmitter = require('events');

const Control = require('./control');


class Game extends EventEmitter {
	
	
	// Prepare game data, might be server or client
	construcror(opts) {
		
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
		this.state.playerlist.forEach(player => {
			const vx = dt * ( (player.control.right?1:0) - (player.control.left?1:0) );
			this.apply({ type: 'SET_X', data: { x: player.x + vx, id: player.id } });
		});
		
	}
	
	
	// Private version of dispatch with event emission
	apply(action) {
		this.dispatch(action);
		this.emit('action', action);
	}
	
	addPlayer(id) {
		this.dispatch({ type: 'ADD_CL', data: id });
	}
	
	removePlayer(id) {
		this.dispatch({ type: 'REM_CL', data: id });
	}
	
	// Action processor
	dispatch(action) {
		
		switch(action.type) {
			
			case 'ADD_CL':
				// TODO: make a class maybe? or even two...
				const player = {
					id: action.data,
					x : 0,
					y : 0,
					settings: {},
					control : new Control(),
				};
				this.state.players[action.data] = player;
				this.state.playerlist.push(player);
				
				if (this.state.id === action.data) {
					this._updatePlayer = function () {
						player.control.fetch();
						if (player.control.quit) {
							this.emit('quit');
						}
						this.apply({ type: 'SET_CTL', data: player.control.toArray() });
					};
				}
				
				break;
				
			case 'REM_CL':
				delete this.state.players[action.data];
				this.state.playerlist = this.state.playerlist.filter(p => p.id !== action.data);
				if (this.state.id === action.data) {
					this._updatePlayer = ()=>{};
				}
				break;
				
			case 'SET_CTL':
				this.state.players[action.clid].control.fromArray(action.data);
				break;
				
			case 'SET_X':
				this.state.players[action.data.id].x = action.data.x;
				this.state.players[action.data.id].y = Math.sin(action.data.x);
				break;
				
			default: break;
			
		}
		
	}
	
}

module.exports = Game;
