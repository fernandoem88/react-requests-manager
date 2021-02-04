import uniqid from 'uniqid'
import {
  Store,
  ProcessInfo,
  ActionUtils,
  RequestInfo,
  RequestUtils,
  RequestState,
  ContextInfo
} from 'types'
import getHelpers, { mapRecord, isCancellableStatus } from './helpers'
import getReducer from './reducer'

const createRequests = () => <
  Requests extends Record<
    any,
    (utils: RequestUtils<any>, params: any) => Promise<void | false>
  >,
  ExtraActions extends
    | []
    | [Record<any, (utils: ActionUtils<Requests>, params: any) => void>]
>(
  requestsRegister: Requests,
  ...[extraActions]: ExtraActions
) => {
  const configurator = (store: Store, contextName: string) => {
    type RequestKey = keyof Requests
    type RequestsParams<K extends RequestKey> = Requests[K] extends (
      utils: any,
      ...args: infer Params
    ) => any
      ? Params
      : []

    type ExtraActionKey = ExtraActions extends []
      ? keyof {}
      : keyof ExtraActions[0]
    type ExtraActionsParams<
      K extends ExtraActionKey
    > = ExtraActions[0][K] extends (utils: any, ...args: infer Params) => any
      ? Params
      : []

    const contextId = uniqid('ContextId__')
    const helpers = getHelpers(store, contextId)

    const stateReducer = getReducer(store, contextId)

    const initializeRequests = () => {
      const initialContext: ContextInfo<any> = {
        requests: {},
        name: contextName,
        id: contextId,
        subscribersCount: 0
      }
      helpers.setContextInfo(initialContext)
      const requestsInfo = mapRecord(requestsRegister, (_, name) => {
        const requestInfo: RequestInfo<any> = {
          id: uniqid('RequestId__'),
          totalCreated: 0,
          type: 'SingleType',
          isProcessing: false,
          name: name as string,
          contextId,
          processes: { byId: {}, ids: [] }
        }
        return requestInfo
      }) as {
        [K in RequestKey]: RequestInfo<RequestsParams<K>[0]>
      }
      helpers.setContextRequests(requestsInfo)
    }

    // ****** REQUEST UTILS ********

    const getRequestUtils = (
      requestName: RequestKey,
      processId: string
    ): RequestUtils<RequestsParams<typeof requestName>> => {
      const getRequestState = (): RequestState<
        RequestsParams<typeof requestName>
      > => {
        return helpers.getRequestState(requestName as string)
      }
      /**
       * @description abort previous processes
       * @param selector
       */
      const reqName = requestName as string
      const abortPrevious: RequestUtils<any>['abortPrevious'] = (
        selector,
        options
      ) => {
        const {
          processes: {
            byId,
            ids: [...ids]
          }
        } = helpers.getRequestInfo(requestName as string)

        const keepInState = options?.keepInStateOnAbort

        const otherIds = ids.filter((id) => id !== processId)

        const processIdsToAbort = !selector
          ? otherIds
          : otherIds.filter(
              (id, idx) =>
                !byId[id] ||
                selector(helpers.converters.processToState(byId[id]), idx)
            )
        if (processIdsToAbort.length) {
          const payload = {
            requestName: reqName,
            processIds: processIdsToAbort,
            keepInState,
            reason: 'previous'
          }
          const shouldDispatch = stateReducer.ON_ABORT_GROUP(payload)
          helpers.doAbortGroup(processIdsToAbort)
          if (!shouldDispatch) return
          helpers.dispatchToHooks({ type: 'ON_ABORT_GROUP', payload })
        }
      }

      const start: RequestUtils<any>['start'] = (onStart) => {
        const payload = { requestName: reqName, processId }

        const shouldDispatch = stateReducer.ON_START(payload)
        if (shouldDispatch) {
          if (onStart) {
            onStart()
          }
          helpers.dispatchToHooks({ type: 'ON_START', payload })
        }
      }
      /**
       *
      
       * @param options
       * @description cancel this request based on all processes state
       */
      const cancel: RequestUtils<any>['cancel'] = function (
        this: { skipDispatch?: boolean },
        options
      ) {
        const req = helpers.getRequestInfo(requestName as string)
        const {
          processes: { byId }
        } = req
        const { status } = byId[processId]
        if (!isCancellableStatus(status)) {
          return
        }
        helpers.doAbortGroup([processId])
        const keepInState = !!options?.keepInStateOnCancel
        const payload = { requestName: reqName, processId, keepInState }

        const shouldDispatch = stateReducer.ON_CANCEL(payload)
        if (!shouldDispatch) return
        const skipDispatch = !keepInState || !!this.skipDispatch

        helpers.dispatchToHooks({ type: 'ON_CANCEL', payload }, skipDispatch)
        throw new Error('ON_CANCEL')
      }

      const onAbort: RequestUtils<any>['onAbort'] = (callback, options) => {
        if (options?.catchError) {
          helpers.modifyRequestInfo(reqName, (draft) => {
            const { byId } = draft.processes
            if (byId[processId]) {
              byId[processId].handleAbortOnErrorCallback = true
            }
          })
        }
        helpers.addAbortInfo(processId, { callback })
      }

      const clearError: RequestUtils<any>['clearError'] = () => {
        const payload = { requestName: requestName as string }
        const shouldDispatch = stateReducer.ON_CLEAR(payload)
        if (!shouldDispatch) return
        helpers.dispatchToHooks({ type: 'ON_CLEAR', payload })
      }
      const finish: RequestUtils<any>['finish'] = (statusData, onFinish) => {
        const req = helpers.getRequestInfo(requestName as string)
        const finishData =
          typeof statusData === 'string' ? { status: statusData } : statusData
        const payload = {
          processingType: req.type,
          requestName: reqName,
          processId,
          ...finishData
        }
        const shouldDispatch = stateReducer.ON_FINISH(payload)
        if (!shouldDispatch) {
          const process = helpers.getProcessInfo(reqName, processId)
          if (!process) return
          const { handleAbortOnErrorCallback } = process
          if (handleAbortOnErrorCallback && onFinish) {
            onFinish() // callable only once
            helpers.modifyRequestInfo(reqName, (draft) => {
              const { byId } = draft.processes
              if (byId[processId]) {
                byId[processId].handleAbortOnErrorCallback = false
              }
            })
          }
          return
        }
        if (onFinish) {
          onFinish()
        }
        helpers.dispatchToHooks({ type: 'ON_FINISH', payload })
      }

      const getProcessState = () => helpers.getProcessState(reqName, processId)
      return {
        getProcessState,
        clearError,
        getRequestState,
        abortPrevious,
        start,
        cancel,
        finish,
        onAbort
      }
    }

    const createProcess = (requestName: string, params: any) => {
      // clear previous request data and dispatch if necessary
      ACTION_UTILS.resetRequest(requestName)
      const requestIfo = helpers.getRequestInfo(requestName)
      const processId = uniqid('ProcessId__')
      const process: ProcessInfo = {
        index: requestIfo.totalCreated, // + 1
        id: processId,
        params,
        requestName,
        contextId,
        status: 'created',
        timestamp: new Date().getTime(),
        metadata: {}
      }
      return process
    }

    const addProcess = (requestName: string, process: ProcessInfo) => {
      helpers.modifyRequestInfo(requestName, (draft) => {
        const { id: processId } = process
        draft.processes.byId[processId] = process
        draft.processes.ids.push(processId)
        draft.totalCreated += 1
      })
    }

    const createRequest = <
      RequestCreator extends (
        utils: RequestUtils<any>,
        params: any
      ) => Promise<void | false>
    >(
      requestName: string,
      requestCreator: RequestCreator
    ) => {
      return (params: any) => {
        // for each call, we create a new process
        const process = createProcess(requestName, params)
        addProcess(requestName, process)
        const requestUtils: RequestUtils<any> = getRequestUtils(
          requestName,
          process.id
        )
        const __requestCreator__ = requestCreator.bind({
          contextId,
          requestName,
          store
        }) as typeof requestCreator
        const promise = __requestCreator__(requestUtils, params)
        helpers.handleRequestErrors(requestUtils, promise)
        const { status } = helpers.getProcessInfo(requestName, process.id)

        if (status === 'created' || status === 'cancelled') {
          // to show only for dev

          const description =
            status === 'cancelled'
              ? 'was cancelled after being created'
              : 'did not started properly, if you cancelled it using "return false", just ignore this warning! every created process must turned to started, suspended or cancelled!'
          console.warn(
            `Warning on ${requestName} request: process with id ${process.id} ${description}`
          )
          return undefined
        }

        return process.id
      }
    }

    const requests: {
      [K in RequestKey]: (...params: RequestsParams<K>) => string | undefined
    } = mapRecord(requestsRegister, (requestCreator, requestName) => {
      return createRequest(requestName as string, requestCreator)
    }) as any

    const getActionUtils = (): ActionUtils<any> => {
      type AU = ActionUtils<any>
      const resetRequest: AU['resetRequest'] = (requestName: any) => {
        const payload = { requestName }
        const shouldDispatch = stateReducer.ON_RESET_REQUEST(payload)
        if (!shouldDispatch) return
        helpers.dispatchToHooks({ type: 'ON_RESET_REQUEST', payload })
      }
      const getRequestState = (reqName: any) => helpers.getRequestState(reqName)
      const getRequestsState = () => {
        return mapRecord(
          helpers.getContextInfo().requests,
          helpers.converters.requestToState
        ) as any
      }

      const clearErrors: AU['clearErrors'] = (selector) => {
        const { requests } = helpers.getContextInfo()
        if (!selector || typeof selector === 'function') {
          const ids = Object.entries(requests)
            .filter(
              ([_, req]) =>
                !selector ||
                (selector as any)(helpers.converters.requestToState(req))
            )
            .map(([id]) => id)

          if (ids.length) {
            const payload = { requestNames: ids }
            const shouldDispatch = stateReducer.ON_CLEAR_GROUP(payload)
            if (!shouldDispatch) return
            helpers.dispatchToHooks({ type: 'ON_CLEAR_GROUP', payload })
          }
        } else {
          const payload = { requestName: selector as string }
          const shouldDispatch = stateReducer.ON_CLEAR(payload)
          if (!shouldDispatch) return
          helpers.dispatchToHooks({ type: 'ON_CLEAR', payload })
        }
      }
      const abort: AU['abort'] = (reqName, selector, options) => {
        const { requests } = helpers.getContextInfo()
        const keepInState = options?.keepInStateOnAbort
        const reason = options?.reason

        const innerAbort = (name: string, ids: string[]) => {
          if (!ids.length) return
          const payload = {
            requestName: name,
            processIds: ids,
            keepInState,
            reason
          }
          helpers.doAbortGroup(ids)
          const shouldDispatch = stateReducer.ON_ABORT_GROUP(payload)
          if (shouldDispatch) {
            helpers.dispatchToHooks({ type: 'ON_ABORT_GROUP', payload })
          }
        }
        if (!reqName) {
          // abort all requests
          Object.entries(requests).forEach(([name, req]) => {
            innerAbort(name, req.processes.ids)
          })
        } else {
          const { ids, byId } = requests[reqName].processes
          const idsToAbort = ids.filter(
            (id) =>
              !selector ||
              !byId[id] ||
              (selector as any)(helpers.converters.processToState(byId[id]))
          )
          innerAbort(reqName as string, idsToAbort)
        }
      }
      return {
        getRequestState,
        getRequestsState,
        resetRequest,
        clearErrors,
        abort
      }
    }
    const ACTION_UTILS: ActionUtils<Requests> = getActionUtils()

    /**
     * @description create actions
     * @param actionCreator
     */
    const createAction = <
      ActionCreator extends (utils: ActionUtils<Requests>, params: any) => void
    >(
      actionCreator: ActionCreator
    ) => {
      type AParams = ActionCreator extends (u: any, ...params: infer P) => any
        ? P
        : []
      return (...params: AParams) => {
        actionCreator(ACTION_UTILS, params[0])
      }
    }
    const actions: ExtraActionKey extends never
      ? undefined
      : {
          [K in ExtraActionKey]: (...params: ExtraActionsParams<K>) => void
        } =
      extraActions === undefined
        ? undefined
        : (mapRecord(extraActions as any, (actionCreator) => {
            return createAction(actionCreator)
          }) as any)

    initializeRequests()
    return { requests, actions, contextId }
  }
  return configurator
}

export default createRequests
