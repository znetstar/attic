import {OutputFormat} from "../Common/misc";

export default interface Config {
    serverUri: string;
    outputFormat: OutputFormat;
    verbose: boolean;
}

