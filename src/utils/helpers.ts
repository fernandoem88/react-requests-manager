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
  ActionPayload,
  RequestUtilsCommon
} from 'types'
import { defaultProcessDispatcher } from './store'

enum ExcludedFromProcess {
  contextId,
  handleAbortOnErrorCallback,
  keepInStateOnAbort,
  keepInStateOnCancel
}

export const copy = <V>(value: V) => produce(value, () => {}) as V

export const isCancellableStatus = (status: ProcessStatus) => {
  return (
    status === 'created' || status === 'suspended' || status === 'processing'
  )
}

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

  const addResolver = (processId: string, resolver: () => void) => {
    const { resolvers } = getContextRef()
    resolvers[processId] = { resolver }
  }

  const deleteResolver = (processId: string) => {
    const { resolvers } = getContextRef()
    delete resolvers[processId]
  }

  const getResolver = (processId: string) => {
    const { resolvers } = getContextRef()
    return resolvers[processId]
  }

  const addAbortInfo = (
    processId: string,
    data: { callback: () => void; handleOnErrorCallback?: boolean }
  ) => {
    const { abortInfo } = getContextRef()
    abortInfo[processId] = data
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
        processes: ids
          .map((id) => converProcessInfoToState(byId[id]))
          .filter((pcss) => pcss.status !== 'created')
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

  const getContextRef = () => {
    // giving the object with reference
    return store.contexts[contextId]
  }

  type TEST = string
  const getContextName = () => {
    // giving the object with reference
    return getContextRef().info.name as TEST
  }

  const getSubscribersCount = () => {
    return getContextRef().info.subscribersCount
  }
  const getShouldDispatch = () => {
    return !!getContextRef().shouldDispatch
  }
  const setShouldDispatch = (shouldDispatch?: boolean) => {
    getContextRef().shouldDispatch = shouldDispatch
  }
  const getContextInfo = () => {
    // giving the object with reference
    return { ...getContextRef().info } as ContextInfo<any>
  }

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

  const resetRequest = (reqName: string) => {
    const req = getRequestInfo(reqName)
    if (req.isProcessing) return
    deleteAllResolvers(reqName)
    deleteAllAbortInfo(reqName)
    modifyRequestInfo(reqName, (draft) => {
      if (draft.isProcessing) return
      draft.totalCreated = 0
      draft.processes.ids = []
      draft.processes.byId = {}
    })
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
      const process = byId[processId]
      if (!process || !process.keepInStateOnCancel) {
        delete byId[processId]
        ids.splice(ids.indexOf(processId), 1)
      }
    })
  }

  const handleRequestErrors = async (
    requestUtils: RequestUtilsCommon<any>,
    promise: Promise<void | false>
  ) => {
    // const processId = requestUtils.getProcessState().id
    // if (!processId) return
    if (!promise) {
      return
    }
    try {
      const result = await promise
      if (result === false) {
        try {
          requestUtils.cancel.bind({ skipDispatch: true })()
        } catch (error) {}
      }
    } catch (error) {
      if (error?.message === 'ON_CANCEL') {
        return
      }
      throw error
    }
  }

  /**
   *
   * @param requestName
   * @param processId
   * @description execute abort callback and remove the processes from the request if keepInStateOnAbort = false
   */
  const doAbortGroup = (processIds: string[]) => {
    processIds.forEach((id) => {
      const abortInfo = getAbortInfo(id)
      if (abortInfo) {
        const { callback } = abortInfo
        callback()
      }
    })
  }

  const clearAbortedProcesses = (requestName: string, processIds: string[]) => {
    const set = new Set(processIds)
    processIds.forEach(deleteAbortInfo)
    modifyRequestInfo(requestName, (draft) => {
      const { ids, byId } = draft.processes
      draft.processes.ids = ids.filter((id) => {
        const process = byId[id]
        if (process) {
          const { keepInStateOnAbort, status } = byId[id]
          const keepInState = keepInStateOnAbort
          const shouldDelete =
            status === 'aborted' && !keepInState && set.has(id)
          if (shouldDelete) {
            delete byId[id]
          }
          return !shouldDelete
        }
        return false
      })
    })
  }

  const clearCancelledProcesses = (
    requestName: string,
    processIds: string[]
  ) => {
    const set = new Set(processIds)
    processIds.forEach(deleteAbortInfo)
    modifyRequestInfo(requestName, (draft) => {
      const { ids, byId } = draft.processes
      draft.processes.ids = ids.filter((id) => {
        const { keepInStateOnCancel, status } = byId[id]
        const keepInState = keepInStateOnCancel
        const shouldDelete =
          status === 'cancelled' && !keepInState && set.has(id)
        if (shouldDelete) {
          delete byId[id]
        }
        return !shouldDelete
      })
    })
  }

  const startNextSuspendedProcessInqueue = (reqName: string) => {
    const req = getRequestInfo(reqName)
    if (req.type !== 'QueueType') return
    const { byId, ids } = req.processes
    const isProcessing = ids.some(
      (reqId) => byId[reqId]?.status === 'processing'
    )
    if (isProcessing) return
    const suspendedId = ids.find((reqId) => byId[reqId].status === 'suspended')
    if (suspendedId) {
      const { resolver } = getResolver(suspendedId)
      resolver()
    }
  }

  const deleteAllResolvers = (reqName: string) => {
    const req = getRequestInfo(reqName)
    if (req.isProcessing) return
    req.processes.ids.forEach(deleteResolver)
  }

  const deleteAllAbortInfo = (reqName: string) => {
    const req = getRequestInfo(reqName)
    if (req.isProcessing) return
    req.processes.ids.forEach(deleteAbortInfo)
  }

  // after state changed: Post processing
  const onBeforeDispatch = <K extends ActionType>({
    type,
    payload
  }: Action<K>) => {
    switch (type) {
      case 'ON_RESET_REQUEST': {
        // const pl = payload as ActionPayload['ON_FINISH']
        // deleteAllResolvers(pl.requestName)
        // deleteAllAbortInfo(pl.requestName)
        break
      }
      case 'ON_FINISH': {
        const pl = payload as ActionPayload['ON_FINISH']
        const { byId, ids } = getRequestInfo(pl.requestName).processes
        const idsToAbort = ids.filter((id) => byId[id].status === 'aborted')
        doAbortGroup(idsToAbort)
        clearAbortedProcesses(pl.requestName, idsToAbort)
        deleteAllAbortInfo(pl.requestName)
        idsToAbort.forEach(deleteResolver)
        startNextSuspendedProcessInqueue(pl.requestName)
        break
      }
      case 'ON_ABORT':
        {
          const pl = payload as ActionPayload['ON_ABORT']
          clearAbortedProcesses(pl.requestName, [pl.processId])
          deleteAbortInfo(pl.processId) // initial state of abort info
          deleteResolver(pl.processId)
          startNextSuspendedProcessInqueue(pl.requestName)
        }
        break
      case 'ON_ABORT_GROUP':
        {
          const pl = payload as ActionPayload['ON_ABORT_GROUP']
          clearAbortedProcesses(pl.requestName, pl.processIds)
          pl.processIds.forEach(deleteResolver)
          pl.processIds.forEach(deleteAbortInfo)
          startNextSuspendedProcessInqueue(pl.requestName)
        }
        break
      case 'ON_CANCEL':
        {
          const pl = payload as ActionPayload['ON_CANCEL']
          const { keepInState } = pl
          if (!keepInState) {
            doCancel(pl.requestName, pl.processId)
          }
          clearCancelledProcesses(pl.requestName, [pl.processId])
          deleteAbortInfo(pl.processId)
          deleteResolver(pl.processId)
          startNextSuspendedProcessInqueue(pl.requestName)
        }
        break
      default:
        break
    }
  }

  // after state changed: Post processing
  const dispatchToHooks = <K extends ActionType>(
    { type, payload }: Action<K>,
    skipDispatch?: boolean
  ) => {
    const subscribersCount = getSubscribersCount()
    onBeforeDispatch({ type, payload })
    setShouldDispatch(true)
    setTimeout(() => {
      // using canDispatch value to dispatch only once,
      // since the hooks are getting the last state using the context id,
      // it's enought to dispatch only once discarding all other update dispatch
      const canDispatch = getShouldDispatch()
      if (canDispatch) {
        const dispatcher = getDispatcher()
        if (subscribersCount > 0 && !skipDispatch) {
          dispatcher.next({ type, payload, contextId })
        }
      }
      setShouldDispatch(false)
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
    getAbortInfo,
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
    addAbortInfo,
    resetRequest,
    doAbortGroup,
    handleRequestErrors
  }
}

export default getHelpers
