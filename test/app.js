'use strict';

const vars = require('../.');


class Test {
	
	construcror() {
		
		this.state = {
			x    : 0, // client controlled value
			y    : 0, // host calculated and predicted value
			moves: {
				left : false,
				right: false,
			},
		};
		
		this.actions = {
			MOVE_LEFT:  { channel: 'udp', client: true  },
			MOVE_RIGHT: { channel: 'udp', client: true  },
			SET_X:      { channel: 'udp', client: false },
			SET_Y:      { channel: 'udp', client: false },
		};
		
	}
	
	simulate(dt) {
		
		const vx = dt * ( (this.state.moves.right?1:0) - (this.state.moves.left?1:0) );
		this.dispatch('SET_X', this.state.x + vx);
		this.dispatch('SET_Y', Math.sin(this.state.x));
		
	}
	
	dispatch(name, data) {
		
	}
	
	encode(action) {
		
	}
	
	decode() {
		
	}
	
}






const createServer = (cb) => {
	
	const sv = new vars.Server(protocol);
	
	sv.open({port: 27999}, cb);
	
};

const joinServer = (cb) => {
	
	const cl = new vars.Client(protocol);
	
	cl.localServers(() => {
		
		if (cl.serverList.length === 1) {
			
			cl.open(cl.serverList[0], () => {
				
				setInterval(() => {
					
					cl.send('hi', {
						x: 1
					});
					
				}, 2000);
				
			});
		}
	});
	
}

createServer(() => {
	joinServer();
});
