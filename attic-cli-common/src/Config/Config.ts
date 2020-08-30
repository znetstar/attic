import {OutputFormat} from "../misc";

export default interface Config {
    serverUri: string;
    outputFormat: OutputFormat;
    verbose: boolean;
}

