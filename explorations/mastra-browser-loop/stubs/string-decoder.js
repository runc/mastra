export class StringDecoder {
  constructor(encoding = 'utf8') {
    this.encoding = encoding
  }

  write(buffer) {
    if (buffer == null) return ''
    if (typeof buffer === 'string') return buffer
    if (buffer instanceof Uint8Array || ArrayBuffer.isView(buffer)) {
      return new TextDecoder(this.encoding).decode(buffer)
    }
    return String(buffer)
  }

  end(buffer) {
    return this.write(buffer)
  }
}

export default { StringDecoder }
