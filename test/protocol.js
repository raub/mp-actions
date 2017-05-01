'use strict';

const mpact = require('../.');

module.exports = new mpact.Protocol({
	
	version: '1.0',
	
	actions: {
		
		
		SET_CTL: {
			
			reliable: false,
			client  : true,
			
			encoder(binary, data) { binary.pushBits(data); },
			decoder(binary) { return binary.pullBits(); },
			
		},
		
		
		SET_X: {
			
			reliable: false,
			client  : false,
			
			encoder(binary, data) { binary.writeFloat(data); },
			decoder(binary) { return binary.readFloat(); },
			
		},
		
		
	},
	
});
