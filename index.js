const express = require("express")
const jscrypto = require("crypto-js")
const WebSocketServer = require("ws").Server
const app = express()
const port = process.env.PORT || 3000

let socket_client = {}
app.use(express.json())
app.post("/callback/:slug", (req, res) => {
  if(req.headers["content-type"] != "application/json") {
    return res.status(400).json({ msg: "Only json content to append this hook" })
  }
  if(!(req.body.data && req.body.key_pass && typeof req.body.data === "object" && typeof req.body.key_pass === "string")) {
    return res.status(400).json({ msg: "Add params in body to sending hook" })
  }
  if(req.body.key_pass.length < 15) {
    return res.status(400).json({ msg: "Your key_pass is very short, make at long" })
  }
  if(req.body.key_pass.length > 200) {
    return res.status(400).json({ msg: "Your key_pass is very long, make at little short" })
  }
  const encdata = jscrypto.AES.encrypt(JSON.stringify(req.body.data), req.body.key_pass).toString()
  let listed = []
  Object.keys(socket_client).forEach(key => {
    if(key.split(".")[0] === req.params.slug) {
      listed.push(key)
      socket_client[key].socket.send(JSON.stringify({data:encdata}))
    }
  })
  return res.status(200).json({ success: true, msg: `Sending at ${listed.length} clients !`, client: listed})
})
app.use("*", (req, res) => {
  res.status(200).json({ msg: "nothing in here !"})
})

const wsServer = new WebSocketServer({ noServer: true })
const serverApp = app.listen(port, () => {
  console.log(`Hooked: http://localhost:${port}`)
})

serverApp.on("upgrade", (req, socket, head) => {
  wsServer.handleUpgrade(req, socket, head, (socket) => {
    wsServer.emit("connection", socket, req)
  })
})
wsServer.on("connection", (socket, req) => {
  if(!(req.url.split("/")[2] && req.headers["x-local-id-content"] && req.url.match("/ws/"))) {
    socket.send(JSON.stringify({err:{msg:"Can't used main paths !"}}))
    socket.close()
  }
  if(req.url.split("/")[2].length < 12) {
    socket.send(JSON.stringify({err:{msg:"Can't connect with short slug !"}}))
    socket.close()
  }
  if(req.url.split("/")[2].length > 30) {
    socket.send(JSON.stringify({err:{msg:"Slug connect to long !"}}))
    socket.close()
  }
  let px = []
  Object.keys(socket_client).forEach(z => {
    px.push(socket_client[z].id_local)
  })
  if(px.indexOf(req.headers["x-local-id-content"]) != -1) {
    socket.close()
  }
  const a = `${req.url.split("/")[2]}.${require("crypto").randomBytes(15).toString("hex")}`
  socket_client[a] = { id_local: req.headers["x-local-id-content"], socket }
  socket.send(JSON.stringify({client: a, id: a.split(".")[1], msg: "Connected"}))
  socket.on("message", (sock) => {
    socket.send(JSON.stringify({err:{msg:"Only hook can used this !"}}))
  })
  socket.on("close", () => {
    delete socket_client[a]
  })
})