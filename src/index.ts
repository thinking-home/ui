import {
  ComponentType,
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { Decoder } from "io-ts/Decoder";
import { ToastContent, ToastOptions, Id } from "react-toastify";

export * from "./i18n";
export * from "./logger";

// http client
export type PlainObject = Record<
  string,
  string | number | boolean | null | undefined
>;
export type QueryParams = URLSearchParams | PlainObject;
export type QueryData =
  | string
  | PlainObject
  | ArrayBuffer
  | FormData
  | File
  | Blob;

export interface ApiClient {
  get<T>(
    decoder: Decoder<unknown, T>,
    query: { url: string; params?: QueryParams; signal?: AbortSignal }
  ): Promise<T>;
  post<T>(
    decoder: Decoder<unknown, T>,
    query: {
      url: string;
      params?: QueryParams;
      data: QueryData;
      signal?: AbortSignal;
    }
  ): Promise<T>;
}

// message hub
export interface ReceivedMessage<T> {
  topic: string;
  guid: string;
  timestamp: string;
  data: T;
}

export interface MessageHub {
  send<T>(topic: string, data: T): Promise<void>;
  subscribe<T>(
    topic: string,
    decoder: Decoder<unknown, T>,
    callback: (msg: ReceivedMessage<T>) => void
  ): () => void;
}

// toaster
export type ShowToastFn = (content: ToastContent, options?: ToastOptions) => Id;

export interface Toaster {
  show: ShowToastFn;
  showInfo: ShowToastFn;
  showError: ShowToastFn;
  showWarning: ShowToastFn;
  showSuccess: ShowToastFn;
}

// application context
export interface AppContext {
  lang: string;
  api: ApiClient;
  messageHub: MessageHub;
  toaster: Toaster;
}

const context = createContext<AppContext | undefined>(undefined);

export const AppContextProvider = context.Provider;

export const useAppContext = (): AppContext => {
  const value = useContext(context);

  if (value === undefined) {
    throw new Error("ModuleContext is undefined");
  }

  return value;
};

export const useMessageHandler = <T>(
  topic: string,
  decoder: Decoder<unknown, T>,
  callback: (msg: ReceivedMessage<T>) => void,
  deps: unknown[]
): void => {
  const { messageHub } = useAppContext();

  const handler = useCallback(callback, deps);

  useEffect(
    () => messageHub.subscribe(topic, decoder, handler),
    [messageHub, topic, decoder, handler]
  );
};

// modules
export class UiModule {
  constructor(public readonly Component: ComponentType) {}
}

export function createModule(component: ComponentType) {
  return new UiModule(component);
}
