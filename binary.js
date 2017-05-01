'use strict';


/**
 * Bitwise buffer
 * @author Luis Blanco
 */
class Binary {
	
	
	/**
	 * @constructs Binary
	 * @desc Constructs Bits, with some optional parameters.
	 * @return {Bits} instance
	 */
	constructor(opts) {
		
		this._pos  = 0;
		this._size = 0;
		
		this._buffer = Buffer.allocUnsafe(opts.alloc || 64 * 1024);
		
	}
	
	flush() {
		this._pos  = 0;
		this._size = 0;
	}
	
	skip(bytes) {
		this._pos += bytes;
	}
	
	back(bytes) {
		this._pos -= bytes;
	}
	
	pushBits(value) {
		
		const len = value.length;
		this.pushUint8(len);
		
		const steps = Math.ceil(len / 8);
		
		for (let step = 0, i = 0; step < steps; step++) {
			let byte = 0;
			for (let bit = 0; bit < 8 && i < len; bit++, i++) {
				byte |= (1 << bit) & (value[i] ? 1 : 0);
			}
			this.pushUint8(byte);
		}
		
	}
	
	pushUint8(value) {
		this._pos = this._buffer.writeUInt8(value, this._pos);
		this._size = this._pos;
	}
	
	pushUint16(value) {
		this._pos = this._buffer.writeUInt16BE(value, this._pos);
		this._size = this._pos;
	}
	
	pushUint32(value) {
		this._pos = this._buffer.writeUInt32BE(value, this._pos);
		this._size = this._pos;
	}
	
	pushInt8(value) {
		this._pos = this._buffer.writeInt8(value, this._pos);
		this._size = this._pos;
	}
	
	pushInt16(value) {
		this._pos = this._buffer.writeInt16BE(value, this._pos);
		this._size = this._pos;
	}
	
	pushInt32(value) {
		this._pos = this._buffer.writeInt32BE(value, this._pos);
		this._size = this._pos;
	}
	
	pushFloat(value) {
		this._pos = this._buffer.writeFloatBE(value, this._pos);
		this._size = this._pos;
	}
	
	pushBuffer(value) {
		this._pos += value.copy(this._buffer, this._pos);
		this._size = this._pos;
	}
	
	pushString(value) {
		
		const prevPos = this._pos;
		this._pos += 2;
		const len = this._buffer.write(value, this._pos);
		
		this._pos = prevPos;
		this.pushUint16(len);
		this._pos = this._pos + 2 + len;
		this._size = this._pos;
		
	}
	
	pullBits() {
		
		const value = [];
		const len = this.pullUint8();
		
		const steps = Math.ceil(len / 8);
		
		for (let step = 0, i = 0; step < steps; step++) {
			let byte = this.pullUint8();
			for (let bit = 0; bit < 8 && i < len; bit++, i++) {
				value[i] = (1 << bit) & byte;
			}
		}
		
	}
	
	pullUint8() {
		const value = this._buffer.readUInt8(this._pos);
		this._pos += 1;
		return value;
	}
	
	pullUint16() {
		const value = this._buffer.readUInt16BE(this._pos);
		this._pos += 2;
		return value;
	}
	
	pullUint32() {
		const value = this._buffer.readUInt32BE(this._pos);
		this._pos += 4;
		return value;
	}
	
	pullInt8() {
		const value = this._buffer.readInt8(this._pos);
		this._pos += 1;
		return value;
	}
	
	pullInt16() {
		const value = this._buffer.readInt16BE(this._pos);
		this._pos += 2;
		return value;
	}
	
	pullInt32() {
		const value = this._buffer.readInt32BE(this._pos);
		this._pos += 4;
		return value;
	}
	
	pullFloat() {
		const value = this._buffer.readFloatBE(this._pos);
		this._pos += 4;
		return value;
	}
	
	readBuffer() {
		const len = this._buffer.length - this._pos;
		const value = Buffer.allocUnsafe(len);
		this._buffer.copy(value, 0, this._pos);
		this._pos += len;
		return value;
	}
	
	readString() {
		const len = this.pullUint16();
		const value = this._buffer.toString(value, this._pos, len);
		this._pos += len;
		return value;
	}
	
}


module.exports = Binary;
