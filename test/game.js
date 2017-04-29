'use strict';

const EventEmitter = require('events');

const Control = require('./control');


class Game extends EventEmitter {
	
	construcror(net) {
		
		this.net = net;
		
		this.ctl = new Control();
		
		this.state = {
			x  : 0, // client controlled predictable value
			y  : 0, // calculated predictable value
			ctl: this.ctl.toArray(),
		};
		
		
		this.prevTime = Date.now();
		this.timer = setInterval(()=>{
			
			const nextTime = Date.now();
			const dt = nextTime - this.prevTime;
			this.prevTime = nextTime;
			
			this.simulate(dt);
			
			this.ctl.fetch();
			this.apply({ type: 'SET_CTL', data: this.ctl.toArray() });
			
		}, 16);
		
	}
	
	
	simulate(dt) {
		const vx = dt * ( (this.state.moves.right?1:0) - (this.state.moves.left?1:0) );
		this.apply({ type: 'SET_X', data: this.state.x + vx });
	}
	
	
	apply(action) {
		this.dispatch(action);
		this.emit('action', action);
	}
	
	
	dispatch(action) {
		
		switch(action.type) {
			
			case 'SET_CTL':
				this.state.ctl = action.data;
				this.control.fromArray(this.state.ctl);
				break;
				
			case 'SET_X':
				this.state.x = action.data;
				this.state.y = Math.sin(this.state.x);
				break;
				
			default: break;
			
		}
		
	}
	
}

module.exports = Game;
