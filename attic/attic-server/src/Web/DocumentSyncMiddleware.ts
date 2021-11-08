const ShareDB = require('sharedb');
import ApplicationContext from "../ApplicationContext";
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
export function initDocumentSync() {
  const backend = new ShareDB({
    db: require('sharedb-mongo')({ mongo: function(cb: any) { cb(null, ApplicationContext.mongoose.connection) } })
  });

    ApplicationContext.webSocketServer.on('connection', (webSocket) => {
      const stream = new WebSocketJSONStream(webSocket)

      backend.listen(stream, (webSocket as any).user);
  });
}
