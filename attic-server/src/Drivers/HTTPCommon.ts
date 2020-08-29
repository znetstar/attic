export interface IHTTPResponse {
    href: string;
    headers?: Map<string, string>;
    status: number;
    body?: Buffer;
    method: string;
}