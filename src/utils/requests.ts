import uniqid from 'uniqid'
import {
  Store,
  ProcessInfo,
  ActionUtils,
  RequestInfo,
  RequestUtilsStart,
  RequestState,
  ContextInfo
} from 'types'
import getHelpers, { mapRecord, isCancellableStatus } from './helpers'
import getReducer from './reducer'

const createRequests = () => <
  Requests extends Record<
    any,
    (utils: RequestUtilsStart<any>, params: any) => Promise<void | false>
  >,
  Actions extends Record<
    any,
    (utils: ActionUtils<Requests>, params: any) => void
  >
>(
  requestsConfigs: { requests: Requests },
  actionsConfigs?: { actions: Actions }
) => {
  return (store: Store, name: string) => {
    type RequestKey = keyof Requests
    type RequestsParams<K extends RequestKey> = Requests[K] extends (
      utils: any,
      ...args: infer Params
    ) => any
      ? Params
      : []

    type ActionKey = keyof Actions
    type ActionsParams<K extends ActionKey> = Actions[K] extends (
      utils: any,
      ...args: infer Params
    ) => any
      ? Params
      : []

    const contextId = uniqid('ContextId__')
    const helpers = getHelpers(store, contextId)

    const stateReducer = getReducer(store, contextId)

    const initializeRequests = () => {
      const initialContext: ContextInfo<any> = {
        requests: {},
        name,
        id: contextId,
        subscribersCount: 0
      }
      helpers.setContextInfo(initialContext)
      const requestsInfo = mapRecord(requestsConfigs.requests, (_, name) => {
        const requestInfo: RequestInfo<any> = {
          id: uniqid('RequestId__'),
          totalCreated: 0,
          type: 'SingleProcessing',
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

    // initializeRequests();

    // ****** REQUEST UTILS ********

    const getRequestUtils = (
      requestName: RequestKey,
      processId: string
    ): RequestUtilsStart<RequestsParams<typeof requestName>> => {
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
      const abortPrevious: RequestUtilsStart<any>['abortPrevious'] = (
        selector
      ) => {
        const {
          processes: {
            byId,
            ids: [...ids]
          }
        } = helpers.getRequestInfo(requestName as string)

        const filteredIds = ids.filter((id) => id !== processId)
        const processIdsToAbort = !selector
          ? filteredIds
          : filteredIds.filter((id, idx) =>
              selector(helpers.converters.processToState(byId[id]), idx)
            )
        if (processIdsToAbort.length) {
          if (processIdsToAbort.length === 1) {
            const payload = {
              requestName: reqName,
              processId: processIdsToAbort[0],
              reason: 'previous'
            }
            const proceed = stateReducer.ON_ABORT(payload)
            if (!proceed) return
            helpers.dispatchToHooks({ type: 'ON_ABORT', payload })
          } else {
            const payload = {
              requestName: reqName,
              processIds: processIdsToAbort,
              reason: 'previous'
            }
            const proceed = stateReducer.ON_ABORT_GROUP(payload)
            if (!proceed) return
            helpers.dispatchToHooks({ type: 'ON_ABORT_GROUP', payload })
          }
        }
      }

      const start: RequestUtilsStart<any>['start'] = (onStart) => {
        const payload = { requestName: reqName, processId }

        const proceed = stateReducer.ON_START(payload)
        if (proceed) {
          if (onStart) {
            onStart()
          }
          helpers.dispatchToHooks({ type: 'ON_START', payload })
        }
        // return processId
      }
      /**
       *
       * @param shouldCancel
       * @param options
       * @description cancel this request based on all processes state
       */
      const cancel: RequestUtilsStart<any>['cancel'] = function (
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
        const keepInState = !!(options && options.keepInStateOnCancel)
        const payload = { requestName: reqName, processId, keepInState }

        const proceed = stateReducer.ON_CANCEL(payload)
        if (!proceed) return
        const skipDispatch = !keepInState || !!this.skipDispatch

        helpers.dispatchToHooks({ type: 'ON_CANCEL', payload }, skipDispatch)
        throw new Error('ON_CANCEL')
      }

      const onAbort: RequestUtilsStart<any>['onAbort'] = (
        callback,
        options
      ) => {
        helpers.addAbortInfo(processId, callback)
        if (options?.keepInStateOnAbort) {
          helpers.modifyRequestInfo(requestName as string, (draft) => {
            // draft.persistableProcessesOnAbort.push(processId);
            draft.processes.byId[processId].keepInStateOnAbort = true
          })
        }
      }

      const clearError: RequestUtilsStart<any>['clearError'] = () => {
        const payload = { requestName: requestName as string }
        const proceed = stateReducer.ON_CLEAR(payload)
        if (!proceed) return
        helpers.dispatchToHooks({ type: 'ON_CLEAR', payload })
      }
      const finish: RequestUtilsStart<any>['finish'] = (
        statusData,
        onFinish
      ) => {
        const req = helpers.getRequestInfo(requestName as string)
        const finishData =
          typeof statusData === 'string' ? { status: statusData } : statusData
        const payload = {
          processingType: req.type,
          requestName: reqName,
          processId,
          ...finishData
        }
        const proceed = stateReducer.ON_FINISH(payload)
        if (!proceed) return
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
        utils: RequestUtilsStart<any>,
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
        const requestUtils: RequestUtilsStart<any> = getRequestUtils(
          requestName,
          process.id
        )
        const __requestCreator__ = requestCreator.bind({
          contextId,
          requestName,
          store
        }) as typeof requestCreator
        const promise = __requestCreator__(requestUtils, params)
        handleRequestErrors(process.id, promise, requestUtils.cancel)
        const { status } = requestUtils.getProcessState()

        if (status === 'created' || status === 'cancelled') {
          // to show only for dev
          const description =
            status === 'cancelled'
              ? 'was cancelled after being created'
              : 'did not started properly'
          console.warn(
            `Warning on ${requestName} request: process with id ${process.id} ${description}`
          )
          return undefined
        }

        return process.id
      }
    }

    const handleRequestErrors = async (
      processId: string,
      promise: Promise<void | false>,
      cancel: RequestUtilsStart<any>['cancel']
    ) => {
      if (!processId) return
      if (!promise) {
        return
      }
      try {
        const result = await promise
        if (result === false) {
          try {
            cancel.bind({ skipDispatch: true })()
          } catch (error) {}
        }
      } catch (error) {
        if (error?.message === 'ON_CANCEL') {
          return
        }
        throw error
      }
    }

    const requests: {
      [K in RequestKey]: (...params: RequestsParams<K>) => string | undefined
    } = mapRecord(requestsConfigs.requests, (requestCreator, requestName) => {
      return createRequest(requestName as string, requestCreator)
    }) as any

    const getActionUtils = (): ActionUtils<any> => {
      type AU = ActionUtils<any>
      const resetRequest: AU['resetRequest'] = (requestName: any) => {
        const payload = { requestName }
        const proceed = stateReducer.ON_RESET_REQUEST(payload)
        if (!proceed) return
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
            const proceed = stateReducer.ON_CLEAR_GROUP(payload)
            if (!proceed) return
            helpers.dispatchToHooks({ type: 'ON_CLEAR_GROUP', payload })
          }
        } else {
          const payload = { requestName: selector as string }
          const proceed = stateReducer.ON_CLEAR(payload)
          if (!proceed) return
          helpers.dispatchToHooks({ type: 'ON_CLEAR', payload })
        }
      }
      const abort: AU['abort'] = (reqName, selector) => {
        const { requests } = helpers.getContextInfo()
        if (!reqName) {
          Object.entries(requests).forEach(([name, req]) => {
            const payload = {
              requestName: name,
              processIds: req.processes.ids
            }
            const proceed = stateReducer.ON_ABORT_GROUP(payload)
            if (proceed) {
              helpers.dispatchToHooks({ type: 'ON_ABORT_GROUP', payload })
            }
          })
        } else {
          const ids = Object.entries(requests[reqName].processes.byId)
            .filter(
              ([_, proceesInfo]) =>
                !selector ||
                (selector as any)(
                  helpers.converters.processToState(proceesInfo)
                )
            )
            .map(([id]) => id)
          const payload = {
            requestName: reqName as string,
            processIds: ids
          }
          const proceed = stateReducer.ON_ABORT_GROUP(payload)
          if (proceed) {
            helpers.dispatchToHooks({ type: 'ON_ABORT_GROUP', payload })
          }
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
    // const { reducers } = reducersConfigs;
    const actions: ActionKey extends undefined
      ? {}
      : {
          [K in ActionKey]: (...params: ActionsParams<K>) => void
        } = !actionsConfigs
      ? {}
      : (mapRecord(actionsConfigs.actions, (actionCreator) => {
          return createAction(actionCreator)
        }) as any)

    initializeRequests()
    return { requests, actions, contextId }
  }
}

export default createRequests
