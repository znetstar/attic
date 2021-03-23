import Config from './Config';
import {OutputFormat} from "../misc";

export default <Config>{
    serverUri: 'http://localhost:7373',
    verbose: false,
    outputFormat: OutputFormat.text,
    username: 'root',
    password: 'root',
    clientId: 'attic',
    clientSecret: 'attic'
};
