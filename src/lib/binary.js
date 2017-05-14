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
		
		opts = opts || {};
		
		this._pos  = 0;
		this._size = 0;
		
		this._buffer = Buffer.allocUnsafe(opts.alloc || 64 * 1024);
		
	}
	
	get size() { return this._size; }
	get length() { return this._size; }
	
	get pos() { return this._pos; }
	set pos(v) { this._pos = v; this._size = Math.max(this._size, this._pos); }
	
	flush(ammount) {
		
		if (ammount && ammount < this._size) {
			this._buffer.copy(this._buffer, 0, ammount, this._size);
			this._pos  = Math.max(0, this._pos - ammount);
			this._size -= ammount;
		} else {
			this._pos  = 0;
			this._size = 0;
		}
		
	}
	
	pushBits(value) {
		
		const len = value.length;
		this.pushUint8(len);
		
		const steps = Math.ceil(len / 8);
		
		for (let step = 0, i = 0; step < steps; step++) {
			let byte = 0;
			for (let bit = 0; bit < 8 && i < len; bit++, i++) {
				
				byte |= (1 << bit) & (value[i] ? 0xFF : 0);
				
			}
			this.pushUint8(byte);
		}
		
	}
	
	pushUint8(value) {
		this.pos = this._buffer.writeUInt8(value, this._pos);
	}
	
	pushUint16(value) {
		this.pos = this._buffer.writeUInt16BE(value, this._pos);
	}
	
	pushUint32(value) {
		this.pos = this._buffer.writeUInt32BE(value, this._pos);
	}
	
	pushInt8(value) {
		this.pos = this._buffer.writeInt8(value, this._pos);
	}
	
	pushInt16(value) {
		this.pos = this._buffer.writeInt16BE(value, this._pos);
	}
	
	pushInt32(value) {
		this.pos = this._buffer.writeInt32BE(value, this._pos);
	}
	
	pushFloat(value) {
		this.pos = this._buffer.writeFloatBE(value, this._pos);
	}
	
	pushBuffer(value) {
		this.pushUint16(value.length);
		value.copy(this._buffer, this._pos);
		this.pos += value.length;
	}
	
	pushString(value) {
		
		const prevPos = this._pos;
		this._pos += 2;
		const len = this._buffer.write(value, this._pos, undefined, 'utf8');
		
		this._pos = prevPos;
		this.pushUint16(len);
		
		this.pos = this._pos + len;
		
	}
	
	pullBits() {
		
		const len = this.pullUint8();
		const value = new Array(len);
		
		const steps = Math.ceil(len / 8);
		
		for (let step = 0, i = 0; step < steps; step++) {
			let byte = this.pullUint8();
			for (let bit = 0; bit < 8 && i < len; bit++, i++) {
				value[i] = ((1 << bit) & byte) >> bit;
			}
		}
		
		return value;
		
	}
	
	pullUint8() {
		const value = this._buffer.readUInt8(this._pos);
		this.pos += 1;
		return value;
	}
	
	pullUint16() {
		const value = this._buffer.readUInt16BE(this._pos);
		this.pos += 2;
		return value;
	}
	
	pullUint32() {
		const value = this._buffer.readUInt32BE(this._pos);
		this.pos += 4;
		return value;
	}
	
	pullInt8() {
		const value = this._buffer.readInt8(this._pos);
		this.pos += 1;
		return value;
	}
	
	pullInt16() {
		const value = this._buffer.readInt16BE(this._pos);
		this.pos += 2;
		return value;
	}
	
	pullInt32() {
		const value = this._buffer.readInt32BE(this._pos);
		this.pos += 4;
		return value;
	}
	
	pullFloat() {
		const value = this._buffer.readFloatBE(this._pos);
		this.pos += 4;
		return value;
	}
	
	pullBuffer() {
		const len = this.pullUint16();
		const value = Buffer.allocUnsafe(len);
		this._buffer.copy(value, 0, this._pos, this._pos + len);
		this.pos += len;
		return value;
	}
	
	pullString() {
		const len = this.pullUint16();
		const value = this._buffer.toString('utf8', this._pos, this._pos+len);
		if (len === 0) {
			console.log('000000', (new Error()).stack);
		}
		// console.log('STRPULL', this._pos, len, '->', value.length, value);
		this.pos += len;
		return value;
	}
	
	toBuffer() {
		const value = Buffer.allocUnsafe(this._size);
		this._buffer.copy(value, 0, 0, this._size);
		return value;
	}
	
	accumulate(value) {
		value.copy(this._buffer, this._pos)
		this.pos += value.length;
	}
	
}


module.exports = Binary;
