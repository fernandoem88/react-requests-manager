declare module 'types' {
  import { Subject as SJ, Subscription } from 'rx-subject'
  export class Subject<T = any> {
    constructor()
    next(value: T): void
    subscribe(subscriber: (value: T) => void): Subscription
  }
  // ******* ******* ******* \\
  // ******* ******* ******* \\
  // *******         ******* \\
  // ******* HELPERS ******* \\
  // *******         ******* \\
  // ******* ******* ******* \\
  // ******* ******* ******* \\
  export type MapRecord<Value> = <
    Rec extends Record<any, Value>,
    R,
    Mapper extends (value: Value) => R
  >(
    record: Rec,
    mapper: Mapper
  ) => Record<keyof Rec, R>

  export type KeySymbol = string | number | symbol
  export type Dictionary<T> = { [K: string]: T }
  type KeysRecord<T, Obj extends {}> = {
    [K in keyof Obj]: Obj[K] extends T ? K : never
  }
  export type KeysOfType<T, Obj extends {}> = KeysRecord<
    T,
    Obj
  >[keyof Obj] extends never
    ? never
    : KeysRecord<T, Obj>[keyof Obj]

  export type PickKeysOfType<T, Obj extends {}> = {
    [K in KeysOfType<T, Obj>]: Obj[K]
  }
  export type OmitKeysOfType<T, Obj extends {}> = {
    [K in keyof Omit<Obj, KeysOfType<T, Obj>>]: Obj[K]
  }

  // ******* ******* ******* \\
  // ******* ******* ******* \\
  // *******         ******* \\
  // ******* PROCESS ******* \\
  // *******         ******* \\
  // ******* ******* ******* \\
  // ******* ******* ******* \\
  export interface ProcessInfo<Params = any> {
    requestName: string
    contextId: string
    id: string
    timestamp: number
    params: Params
    status: ProcessStatus
    metadata: Dictionary<any>
    keepInStateOnAbort?: boolean
    keepInStateOnCancel?: boolean // keep this process till the hole process will finish
    index: number
  }

  export type ProcessState<Params = any> = Omit<
    ProcessInfo<Params>,
    | 'abortInfo'
    | 'resolver'
    | 'contextId'
    | 'keepInStateOnAbort'
    | 'keepInStateOnCancel'
  >

  export enum ExcludedFromProcess {
    abortInfo,
    resolver,
    contextId
  }

  export type ProcessStatus =
    | 'created' // initial state
    // waiting in queue
    | 'suspended' // only for queue
    | 'processing' // processing
    | 'cancelled' // finished
    | 'aborted' // finished
    | 'error' // finished
    | 'success' // finished

  // export type QueueValue<Params = any> = {
  //   processesInfo: ProcessState<Params>[];
  //   getIsFirst: () => boolean;
  //   getIsLast: () => boolean;
  // };

  // ******* ****** ******* \\
  // ******* ****** ******* \\
  // *******        ******* \\
  // ******* ACTION ******* \\
  // *******        ******* \\
  // ******* ****** ******* \\
  // ******* ****** ******* \\
  export interface RequestInfo<Params = any, Error = any> {
    isProcessing: boolean
    id: string
    type: ProcessingType
    totalCreated: number // starts from 0, increments by 1 in each process and restart from 0 on action finished
    name: string
    contextId: string
    processes: {
      byId: Record<any, ProcessInfo<Params>>
      ids: string[]
    }
    error?: Error
  }

  /**
   * @description RequestState comes from RequestInfo excluding some keys
   */
  export interface RequestState<Params = any> {
    isProcessing: boolean
    error?: any
    details: {
      name: string
      id: string
      context: string
      processes: ProcessState<Params>[]
      count: {
        // created: number;
        suspended: number
        processing: number
        // not finished
        cancelled: number
        aborted: number
        // finish
        success: number
        error: number
        // total without created
        total: number
      }
    }
  }
  export type ProcessingType = 'Queue' | 'MultiProcesses' | 'SingleProcess'
  // export type RequestInfoRecord = Record<any, RequestInfo>;

  // *******  ******  ******* \\
  // *******  ******  ******* \\
  // *******          ******* \\
  // ******* Context  ******* \\
  // *******          ******* \\
  // *******  ******  ******* \\
  // *******  ******  ******* \\
  // export type ContextInfoRecord = Record<any, RequestInfoRecord>;
  export type ProcessDispatcher = Subject<{
    type: ActionType | 'ON_STATE'
    payload: any
    contextId: string
  }>
  export interface ContextInfo<Requests extends Record<any, any>> {
    name: string
    id: string
    // state: State;
    requests: Record<keyof Requests, RequestInfo>
    $context?: ProcessDispatcher
    subscribersCount: number
  }

  /**
   * @description the context state of an actions group
   */
  // export type ContextState<State> = ContextInfo<State, Record<any, any>>["state"];

  export interface ExtraContextState {
    errorIds: string[]
    processingIds: string[]
  }

  // *******  ****** ******* \\
  // *******  ****** ******* \\
  // *******         ******* \\
  // *******  STORE  ******* \\
  // *******         ******* \\
  // *******  ****** ******* \\
  // *******  ****** ******* \\
  export type GetDerivedState<Result, Params = any, Error = any> = <
    ActionRecord extends Dictionary<RequestState<Params>>
  >(
    result: Result,
    actions: ActionRecord,
    trigger?: ProcessState<Params>
  ) => any
  export interface Store {
    id: string
    contexts: Dictionary<{
      info: ContextInfo<any>
      abortInfo: Dictionary<{ callback: () => void }>
      resolvers: Dictionary<{
        resolver: (onStart?: any) => void
        onStart?: (reducers: any) => void
      }>
    }>
    dispatchers: {
      $redux: Subject<any>
      $actions: Subject<any>
    }
  }

  // ******* ******* ******* \\
  // ******* ******* ******* \\
  // *******         ******* \\
  // *******  UTILS  ******* \\
  // *******         ******* \\
  // ******* ******* ******* \\
  // ******* ******* ******* \\

  export interface ActionUtils<Requests extends Record<any, any>> {
    // getContextState: () => ContextState<State>;
    getRequestState: (key: keyof Requests) => RequestState
    getRequestsState: () => Record<keyof Requests, RequestState>
    clearErrors: (
      selector?: keyof Requests | ((requestState: RequestState) => boolean)
    ) => void
    abort: <Key extends keyof Requests, Params = any>(
      requestName?: Key,
      selector?: (process: ProcessState<Params>, index: number) => boolean
    ) => void
  }
  export interface RequestUtils<Params = any> {
    getProcessState: () => ProcessState<Params>
    getRequestState: () => RequestState<Params>
    // getContextState: () => ContextState<State>;
    clearError: (newError?: any) => void
    /**
     * @param shouldCancel a function to check if the current process should be cancel or not
     */
    cancel: (options?: { keepInStateOnCancel?: boolean }) => void
    finish: (
      statusData:
        | 'success'
        | 'error'
        | {
            /**
             * @description process status
             */
            status: 'success' | 'error'
            /**
             * @description request error
             */
            error?: any
            /**
             * @description process metadata
             */
            metadata?: Dictionary<any>
          },
      onFinish?: () => void
    ) => void
    abortPrevious: (
      selector?: (process: ProcessState<Params>, index: number) => boolean
    ) => void
    onAbort: (
      callback: () => void,
      options?: { keepInStateOnAbort?: boolean }
    ) => void
    // __reducers: Reducers;
  }

  export interface RequestUtilsStart<Params = any>
    extends RequestUtils<Params> {
    start: (onStart?: () => void) => string
  }

  export interface RequestUtilsQueue<Params = any>
    extends RequestUtils<Params> {
    inQueue: (onStart?: () => void) => Promise<void>
  }

  // ******* ******** ******* \\
  // ******* ******** ******* \\
  // *******          ******* \\
  // ******* REDUCERS ******* \\
  // *******          ******* \\
  // ******* ******** ******* \\
  // ******* ******** ******* \\
  // ******* ******** ******* \\
  export interface ActionPayload {
    ON_STATE: {}
    ON_SUSPEND: { requestName: string; processId: string }
    ON_START: {
      // processingType: ProcessingType;
      requestName: string
      processId: string
    }
    ON_CANCEL: {
      requestName: string
      processId: string
      keepInState: boolean
    }
    ON_ABORT: {
      // processingType: ProcessingType;
      requestName: string
      reason?: any
      processId: string
    }
    ON_ABORT_GROUP: {
      // processingType: ProcessingType;
      requestName: string
      reason?: any
      processIds: string[]
    }
    ON_FINISH: {
      requestName: string
      processingType: ProcessingType
      processId: string
      // state?: { result: any; error?: any };
      error?: any
      status: 'success' | 'error'
      metadata?: Dictionary<any>
    }
    ON_CLEAR: {
      requestName: string
    }
    ON_CLEAR_GROUP: {
      requestNames: string[]
    }
  }

  export type ActionType = keyof ActionPayload
  export interface Action<K extends ActionType | any = any> {
    type: ActionType
    payload: K extends ActionType ? ActionPayload[K] : any
  }

  export type GetSelectorParam<Selector> = Selector extends (
    param1: any,
    reqs: any,
    ...params: infer Params
  ) => any
    ? Params[0] extends undefined
      ? []
      : Params
    : []
}

declare module 'state-manager-store' {
  export interface StateManagerStore<State = any> {
    // dispatch: (action: A) => void
    getState: () => State
    subscribe: (listener: () => void) => { unsubscribe: any }
  }
}

declare module 'shallow-utils' {
  export function shallowEqual<T extends any>(v1: T, v2: T): boolean
  export function shallowEqualExcept(): any
  export function shallowItemsDifferExcept(): any
}

declare module 'uniqid'