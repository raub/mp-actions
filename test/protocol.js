'use strict';

const mpact = require('../.');

module.exports = new mpact.Protocol({
	
	version: '1.0',
	
	actions: {
		
		
		SET_CTL: {
			
			channel: 'udp',
			client : true,
			
			encoder(data) {
				const bits = new mpact.Bits();
				bits.writeUint8(data.length);
				data.forEach(k => bits.writeBit(k));
				return bits;
			},
			
			decoder(bits) {
				const data = [];
				for (let i = bits.readUint8(); i > 0; i--) {
					data.push(bits.readBit());
				}
				return data;
			},
		},
		
		
		SET_X: {
			
			channel: 'udp',
			client : false,
			
			encoder(data) {
				const bits = new mpact.Bits();
				bits.writeFloat32(data);
				return bits;
			},
			
			decoder(bits) {
				return bits.readFloat32();
			},
			
		},
		
		
	},
	
});
