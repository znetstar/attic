import {OutputFormat} from "../misc";

export default interface Config {
    serverUri: string;
    outputFormat: OutputFormat;
    verbose: boolean;
    accessToken?: string;
    refreshToken?: string;
    username?: string;
    password?: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    defaultScope: string[];
}

