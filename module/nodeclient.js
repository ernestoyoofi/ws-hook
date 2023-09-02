const WebSocket = require("ws")
const enc = require("crypto-js")

const sleepTime = async (time) => {
  return new Promise((res) => {
    setTimeout(() => res(), time || 4000)
  })
}

const generateId = () => {
  const stringTx = "abcdef1234567890"
  let ch = ""
  for(let a in [...Array(16*2)]) {
    ch += stringTx.split("")[Math.floor(Math.random() * stringTx.length)]
  }

  return ch
}

class SocketClient {
  constructor({ baseurl, slug, key_pass, log = false } = {}) {
    this.config = {
      base: baseurl||"wss://icyawaremodule-04d8aa7dc0160dc03b9c7b52c72bf193.ernestoyoofi.repl.co",
      slug: slug,
      key_pass: key_pass
    }
    this.log = log
    this.client = {}
    this.id_local = generateId()
    this.event = {
      disconnect: [],
      connect: [],
      message: [],
      error: []
    }
    this.connect = false

    this.startConnect()
  }
  startConnect() {
    const __sock = new WebSocket(`${this.config.base}/ws/${this.config.slug}`, {
      headers: {
        "x-local-id-content": this.id_local
      }
    })
    __sock.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data.toString())
        if(data.data) {
          const e = enc.AES.decrypt(data.data, this.config.key_pass).toString(enc.enc.Utf8)
          if(e.slice(0, 2) == '{"') {
            this.event.message.forEach(cb => {
              cb({ id: "message", data: JSON.parse(e) })
            })
          }
        }
      } catch(err) {
        this.event.error.forEach(cb => {
          const _a = { catching: { err: err.stack } }
          if(this.log === true) { console.log("[LOGS]:", _a) }
          cb(_a)
        })
      }
    }
    __sock.onopen = () => {
      this.connect = true
      this.event.connect.forEach(cb => {
        const _a = { status: "connect", connect: true }
        if(this.log === true) { console.log("[LOGS]:", _a) }
        cb(_a)
      })
    }
    __sock.onclose = async () => {
      this.connect = true
      this.event.disconnect.forEach(cb => {
        const _a = { status: "disconnect", connect: false }
        if(this.log === true) { console.log("[LOGS]:", _a) }
        cb(_a)
      })
      await sleepTime()
      if(this.connect) {
        this.startConnect()
      }
    }
    __sock.onerror = async (e) => {
      this.connect = false
      this.event.error.forEach(cb => {
        const _a = { status: "disconnect", connect: false, error: e.message }
        if(this.log === true) { console.log("[LOGS]:", _a) }
        cb(_a)
      })
      await sleepTime()
      if(this.connect) {
        this.startConnect()
      }
    }
  }
  on(event, callback) {
    const _db = Object.keys(this.event)
    if(_db.indexOf(event) === -1) return Promise.reject(new Error(`Match ${event} not founded, only found ${_db.join(", ")}`))
    this.event[event].push(callback)
  }
  use(callback) {
    Object.keys(this.event).forEach(key => {
      this.event[key].push(callback)
    })
  }
}

module.exports = SocketClient