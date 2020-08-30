import { RPCHTTPServer, WebHTTPServer } from './Web/WebServer';
import Config from './Config';
import {loadDrivers} from "./Drivers";
import {loadModels} from "./Database";

loadModels();
loadDrivers();

if (Config.unixSocket) {
    RPCHTTPServer.listen(Config.unixSocket);
}
else if (Config.port) {
    RPCHTTPServer.listen(Config.port, Config.host);
}

if (Config.enableWebResolver && !Config.webResolverShareRpcServer) {
    if (Config.webResolverUnixSocket) {
        RPCHTTPServer.listen(Config.webResolverUnixSocket);
    } else if (Config.webResolverPort) {
        RPCHTTPServer.listen(Config.webResolverPort, Config.webResolverHost);
    }
}