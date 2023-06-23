import { RequestHandler } from 'msw';

type Config = {
    cassetteDir: string;
    onUnhandledRequest: "error" | "record";
};
declare function setupServer(config: Config, ...handlers: RequestHandler[]): {
    listen: (name: string) => () => void;
    cassette: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
};

export { setupServer };
