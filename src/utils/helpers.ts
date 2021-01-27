import produce from 'immer'
import {
  ContextInfo,
  Store,
  RequestInfo,
  RequestState,
  ProcessInfo,
  ProcessState,
  ProcessStatus,
  Dictionary,
  ProcessDispatcher,
  Action,
  ActionType,
  ActionPayload
} from 'types'
import { defaultProcessDispatcher } from './store'

enum ExcludedFromProcess {
  abortInfo,
  resolver,
  contextId
}

export const copy = <V>(value: V) => produce(value, () => {}) as V

export const mapRecord = <
  Rec extends Record<any, any> | Dictionary<any>,
  Mapper extends (value: Rec[keyof Rec], key: keyof Rec) => any
>(
  record: Rec,
  mapper: Mapper
) => {
  return Object.entries(record).reduce((acc: any, [key, value]) => {
    return { ...acc, [key]: mapper(value, key) }
  }, {}) as { [K in keyof Rec]: ReturnType<Mapper> }
}

const getHelpers = (store: Store, contextId: string) => {
  // ****************** \\
  // *** Converters *** \\
  // ****************** \\

  const setContextInfo = (context: ContextInfo<any>) => {
    store.contexts[context.id] = store.contexts[context.id] || ({} as any)
    store.contexts[context.id].info = { ...context } // copy(context);
    store.contexts[context.id].abortInfo =
      store.contexts[context.id].abortInfo || {}
    store.contexts[context.id].resolvers =
      store.contexts[context.id].resolvers || {}
  }

  const addResolver = (
    processId: string,
    resolver: () => void,
    onStart?: (reducers: any) => void
  ) => {
    const { resolvers } = getContextRef()
    resolvers[processId] = { resolver, onStart }
  }

  const deleteResolver = (processId: string) => {
    const { resolvers } = getContextRef()
    delete resolvers[processId]
  }

  const getResolver = (processId: string) => {
    const { resolvers } = getContextRef()
    return resolvers[processId]
  }

  const addAbortInfo = (processId: string, callback: () => void) => {
    const { abortInfo } = getContextRef()
    abortInfo[processId] = { callback }
  }

  const getAbortInfo = (processId: string) => {
    const { abortInfo } = getContextRef()
    return abortInfo[processId]
  }

  const deleteAbortInfo = (processId: string) => {
    const { abortInfo } = getContextRef()
    delete abortInfo[processId]
  }
  const convertRequestInfotoState = <Params, Error>(
    requestInfo: RequestInfo<Params, Error>
  ) => {
    const { processes } = requestInfo
    const { byId, ids } = processes
    const count = ids.reduce(
      (acc, reqId) => {
        const { status } = byId[reqId]
        if (status === 'created') {
          return acc
        } else {
          acc[status] += 1
          acc.total += 1
        }
        return acc
      },
      {
        total: 0,
        processing: 0,
        cancelled: 0,
        aborted: 0,
        success: 0,
        error: 0,
        suspended: 0
      }
    )
    const requestState: RequestState<Params> = {
      isProcessing: requestInfo.isProcessing,
      error: produce(requestInfo.error, () => {}),
      details: {
        id: requestInfo.id,
        name: requestInfo.name,
        context: getContextName(),
        count,
        processes: ids.map((id) => converProcessInfoToState(byId[id]))
      }
    }

    return requestState
  }
  const converProcessInfoToState = <Params>(process: ProcessInfo<Params>) => {
    const processState: ProcessState<Params> = produce(process, (draft) => {
      Object.keys(ExcludedFromProcess).forEach((key) => {
        delete draft[key as keyof typeof draft]
      })
    })
    return processState
  }
  // const convertContextInfoToState = <State>(
  //   contextInfo: ContextInfo<State, any>
  // ) => {
  //   return copy(contextInfo.state) as State;
  // };

  // *************** \\
  // *** setters *** \\
  // *************** \\

  const getContextRef = () => {
    // giving the object with reference
    return store.contexts[contextId]
  }

  const getContextName = () => {
    // giving the object with reference
    return getContextRef().info.name
  }

  const getSubscribersCount = () => {
    return getContextRef().info.subscribersCount
  }
  const getContextInfo = () => {
    // giving the object with reference
    return { ...getContextRef().info } as ContextInfo<any>
  }
  // const getContextState = () => {
  //   const context = getContextInfo();
  //   return copy({ ...context.state }) as any;
  // };

  const getContextSubscribersCount = () => {
    return getContextInfo().subscribersCount
  }

  const getRequests = () => {
    const reqs = { ...getContextInfo().requests }
    return mapRecord(reqs, convertRequestInfotoState)
  }

  const getRequestInfo = (actionName: string) => {
    const reqs = { ...getContextInfo().requests }
    return copy(reqs[actionName])
  }

  const getRequestType = (actionName: string) => {
    return getRequestInfo(actionName).type
  }
  const getRequestState = (actionName: string) => {
    const requestInfo = getRequestInfo(actionName)
    return convertRequestInfotoState(requestInfo)
    // exclude special keys from
  }

  const getRequestsInfoByProcessing = (isProcessing: boolean) => {
    const context = getContextInfo()
    const requests = { ...context.requests }
    return Object.entries(requests)
      .filter(([, request]) => request.isProcessing === isProcessing)
      .map(([, request]) => copy(request))
  }

  const getProcessInfo = (requestName: string, processId: string) => {
    const {
      processes: { byId }
    } = getRequestInfo(requestName)
    return copy(byId[processId])
  }

  const getProcessState = (requestName: string, processId: string) => {
    return converProcessInfoToState(getProcessInfo(requestName, processId))
  }

  const getProcessIdsByStatus = (
    requestName: string,
    status: ProcessStatus
  ) => {
    const {
      processes: { byId, ids }
    } = getRequestInfo(requestName)
    return ids.filter((id) => byId[id].status === status)
  }
  const getProcessByStatus = (requestName: string, status: ProcessStatus) => {
    const {
      processes: { byId }
    } = getRequestInfo(requestName)
    return getProcessIdsByStatus(requestName, status).map((id) =>
      copy(byId[id])
    )
  }

  // ***************** \\
  // *** Modifiers *** \\
  // ***************** \\
  const modifyRequestInfo = (
    requestName: string,
    modifier: (action: RequestInfo) => void
  ) => {
    const newContextInfo = modifyContextInfo((ctx) => {
      const request = ctx.requests[requestName as any]
      if (request) {
        modifier(request)
      } else {
        throw new Error(`Request ${requestName} not found`)
      }
    })
    return newContextInfo.requests[requestName as any]
  }
  const modifyContextInfo = (modifier: (context: ContextInfo<any>) => void) => {
    const context = store.contexts[contextId]
    if (!context) throw new Error(`context with id: ${contextId} "not found!`)

    const newContext = produce(context.info, (draft) => {
      modifier(draft as any)
    })
    setContextInfo(newContext)
    return newContext
  }

  // *************** \\
  // *** setters *** \\
  // *************** \\

  const setContextRequests = (requests: Record<any, RequestInfo>) => {
    getContextRef().info.requests = copy(requests)
  }

  const setContextName = (name: string) => {
    getContextRef().info.name = name
  }

  const updateSubscribersCount = (count: 1 | -1) => {
    const ref = getContextRef()
    const currCount = ref.info.subscribersCount
    if (count === -1 && (!currCount || currCount <= 0)) {
      ref.info.subscribersCount = 0
      return 0
    }
    ref.info.subscribersCount += count
    return ref.info.subscribersCount
  }

  const setContextDispatcher = ($context: ProcessDispatcher) => {
    getContextRef().info.$context = $context
  }

  const setDispatcher = (dipatcher: ProcessDispatcher) => {
    getContextRef().info.$context = dipatcher
  }

  const getDispatcher = (): ProcessDispatcher => {
    return getContextInfo().$context || defaultProcessDispatcher
  }
  /**
   *
   * @param requestName
   * @param processId
   * @description remove the process from the request if keepInStateOnCancel = false
   */
  const doCancel = (requestName: string, processId: string) => {
    modifyRequestInfo(requestName, (draft) => {
      const { byId, ids } = draft.processes
      if (!byId[processId].keepInStateOnCancel) {
        delete byId[processId]
        ids.splice(ids.indexOf(processId), 1)
      }
    })
  }

  /**
   *
   * @param requestName
   * @param processId
   * @description execute abort callback and remove the process from the request if keepInStateOnAbort = false
   */
  const doAbort = (requestName: string, processId: string) => {
    deleteResolver(processId)
    const abortInfo = getAbortInfo(processId)
    if (abortInfo) {
      abortInfo.callback()
      deleteAbortInfo(processId)
    }
    modifyRequestInfo(requestName, (draft) => {
      const { byId, ids } = draft.processes
      if (!byId[processId].keepInStateOnAbort) {
        delete byId[processId]
        ids.splice(ids.indexOf(processId), 1)
      }
    })
  }

  /**
   *
   * @param requestName
   * @param processId
   * @description execute abort callback and remove the processes from the request if keepInStateOnAbort = false
   */
  const doAbortGroup = (requestName: string, processIds: string[]) => {
    processIds.forEach((id) => {
      deleteResolver(id)
      const abortInfo = getAbortInfo(id)
      if (abortInfo) {
        abortInfo.callback()
        deleteAbortInfo(id)
      }
    })

    modifyRequestInfo(requestName, (draft) => {
      const { byId, ids } = draft.processes
      const setToDelete = new Set<string>()
      processIds.forEach((processId) => {
        if (!byId[processId].keepInStateOnAbort) {
          delete byId[processId]
          setToDelete.add(processId)
        }
      })
      draft.processes.ids = ids.filter((id) => !setToDelete.has(id))
    })
  }

  const startNextProcessInqueue = (reqName: string) => {
    const req = getRequestInfo(reqName)
    if (req.type !== 'Queue') return
    const { byId, ids } = req.processes
    const [processingId] = ids.filter(
      (reqId) => byId[reqId].status === 'processing'
    )
    if (processingId) return
    const [suspendedId] = ids.filter(
      (reqId) => byId[reqId].status === 'suspended'
    )
    if (suspendedId) {
      const { resolver, onStart } = getResolver(suspendedId)
      resolver(onStart)
    }
  }

  const resetRequest = (reqName: string) => {
    const req = getRequestInfo(reqName)
    if (req.isProcessing) return
    req.processes.ids.forEach(deleteAbortInfo)
    modifyRequestInfo(reqName, (draft) => {
      if (draft.isProcessing) return
      draft.processes.ids = []
      draft.processes.byId = {}
      draft.totalCreated = 0
    })
  }

  // after state changed: Post processing
  const dispatchToHooks = <K extends ActionType>(
    { type, payload }: Action<K>,
    skipdispatch?: boolean
  ) => {
    setTimeout(() => {
      const dispatcher = getDispatcher()
      const subscribersCount = getSubscribersCount()
      if (subscribersCount > 0 && !skipdispatch) {
        dispatcher.next({ type, payload, contextId })
      }
      // post dispatch
      switch (type) {
        case 'ON_FINISH': {
          const pl = payload as ActionPayload['ON_FINISH']
          const { byId, ids } = getRequestInfo(pl.requestName).processes
          const idsToAbort = ids.filter((id) => byId[id].status === 'aborted')
          if (idsToAbort.length) {
            if (idsToAbort.length === 1) {
              doAbort(pl.requestName, idsToAbort[0])
              if (subscribersCount > 0) {
                dispatcher.next({
                  type: 'ON_ABORT',
                  payload: {
                    requestName: pl.requestName,
                    processId: idsToAbort[0],
                    reason: 'ON_FINSH'
                  },
                  contextId
                })
              }
            } else {
              doAbortGroup(pl.requestName, idsToAbort)
              if (subscribersCount > 0) {
                dispatcher.next({
                  type: 'ON_ABORT_GROUP',
                  payload: {
                    requestName: pl.requestName,
                    processIds: idsToAbort,
                    reason: 'ON_FINSH'
                  },
                  contextId
                })
              }
            }
          }
          startNextProcessInqueue(pl.requestName)
          resetRequest(pl.requestName)
          break
        }
        case 'ON_ABORT':
          {
            const pl = payload as ActionPayload['ON_ABORT']
            const { requestName, processId } = pl
            doAbort(requestName, processId)
            startNextProcessInqueue(pl.requestName)
            resetRequest(pl.requestName)
          }
          break
        case 'ON_ABORT_GROUP':
          {
            const pl = payload as ActionPayload['ON_ABORT_GROUP']
            const { requestName, processIds } = pl
            doAbortGroup(requestName, processIds)
            startNextProcessInqueue(pl.requestName)
            resetRequest(pl.requestName)
          }
          break
        case 'ON_CANCEL':
          {
            const pl = payload as ActionPayload['ON_CANCEL']
            const { keepInState } = pl

            if (!keepInState) {
              doCancel(pl.requestName, pl.processId)
            }
            deleteResolver(pl.processId)
            startNextProcessInqueue(pl.requestName)
            resetRequest(pl.requestName)
          }
          break
        default:
          break
      }
    }, 0)
  }

  return {
    converters: {
      requestToState: convertRequestInfotoState,
      processToState: converProcessInfoToState
    },
    copy,
    dispatchToHooks,
    /** Action **/
    addResolver,
    deleteResolver,
    getRequestInfo,
    getRequests,
    getRequestsInfoByProcessing,
    getRequestState,
    getRequestType,
    /** Context **/
    getContextSubscribersCount,
    updateSubscribersCount,
    getContextInfo,
    setContextName,
    setContextDispatcher,
    setContextInfo,
    setContextRequests,
    /** Process **/
    getProcessInfo,
    getProcessState,
    getProcessByStatus,
    getProcessIdsByStatus,
    /** Mapper **/
    mapRecord,
    /** Modifiers **/
    modifyRequestInfo,
    modifyContextInfo,
    getContextName,
    getSubscribersCount,
    getDispatcher,
    setDispatcher,
    addAbortInfo
  }
}

export default getHelpers
