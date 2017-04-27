'use strict';

const vars = require('../.');


const protocol = new vars.Protocol({
	version: '0.1',
	dict: [
		{ name: 'hi' , channel: 'tcp' },
		{ name: 'lol', channel: 'udp' },
	],
});

const createServer = (cb) => {
	
	const sv = new vars.Server(protocol);
	
	sv.open({port: 27999}, cb);
	
};

const joinServer = () => {
	
	const cl = new vars.Client(protocol);
	
	cl.listServers(() => {
		
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
