
export type Middleware = (req: unknown, res: unknown, next?: unknown) => void;
export type middlewareCreator = (...args: any[]) => Middleware;
export type restrictScopeMiddleware = (scope: string) => Middleware;
export type asyncMiddleware = (fn: (req: unknown, res: unknown) => Promise<boolean|undefined|null|string|void>) => Middleware;
export default Middleware;
const x = 1;
