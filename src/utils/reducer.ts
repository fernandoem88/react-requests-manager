import {
  Dictionary,
  ProcessInfo,
  ActionPayload,
  ActionType,
  RequestInfo,
  Store
} from 'types'
import getHelpers, { isCancellableStatus } from './helpers'

const getReducer = (store: Store, contextId: string) => {
  const helpers = getHelpers(store, contextId)
  const getIsProcessing = (
    requestName: string,
    processes: Dictionary<ProcessInfo>,
    processIds: string[]
  ) => {
    const isProcessing =
      processIds.filter((id) => processes[id].status === 'processing').length >
      0
    const requestType = helpers.getRequestType(requestName as any)
    const hasSuspendedProcesss =
      requestType !== 'QueueProcessing'
        ? false
        : processIds.filter((id) => processes[id].status === 'suspended')
            .length > 0
    return isProcessing || hasSuspendedProcesss
  }
  const processReducer: {
    [T in Exclude<ActionType, 'ON_STATE' | 'ON_SUSPEND'>]: (
      payload: ActionPayload[T]
    ) => boolean
  } = {
    ON_RESET_REQUEST(payload) {
      const { requestName } = payload
      const { isProcessing } = helpers.getRequestState(requestName)
      if (isProcessing) return false
      helpers.resetRequest(requestName)
      return true
    },
    ON_START(payload) {
      const { requestName, processId } = payload
      helpers.modifyRequestInfo(requestName as string, (draft) => {
        const { byId } = draft.processes
        byId[processId].status = 'processing'
        draft.isProcessing = true
      })
      return true
    },
    ON_ABORT(payload) {
      const { requestName, processId, reason, keepInState } = payload
      const process = helpers.getProcessInfo(requestName as string, processId)
      if (!process) return false
      const { status } = process
      if (status !== 'processing' && status !== 'suspended') {
        return false
      }
      helpers.modifyRequestInfo(requestName as string, (draft) => {
        const { byId, ids } = draft.processes
        byId[processId].status = 'aborted'
        if (keepInState !== undefined) {
          ids.forEach((id) => {
            byId[id].keepInStateOnAbort = keepInState
          })
        }
        if (reason) {
          const { metadata } = byId[processId]
          metadata.abortReason = reason
        }
        draft.isProcessing = getIsProcessing(requestName as string, byId, ids)
      })

      return true
    },
    ON_ABORT_GROUP(payload) {
      const { requestName, processIds, reason, keepInState } = payload
      const results = processIds.map((id) =>
        processReducer.ON_ABORT({
          requestName,
          processId: id,
          reason,
          keepInState
        })
      )
      return results.some((bool) => bool)
    },
    ON_CLEAR(payload) {
      const { requestName } = payload
      helpers.modifyRequestInfo(requestName as string, (draft: RequestInfo) => {
        draft.error = undefined
      })
      return true
    },
    ON_CLEAR_GROUP(payload) {
      helpers.modifyContextInfo(({ requests }) => {
        payload.requestNames.forEach((requestName: any) => {
          requests[requestName as string].error = undefined
        })
      })
      return true
    },
    ON_FINISH(payload) {
      const {
        requestName,
        processId,
        status,
        processingType,
        metadata,
        error
      } = payload
      const requestInfo = helpers.getRequestInfo(requestName as string)
      const process = helpers.getProcessInfo(requestName as string, processId)
      // if someone called abort but did not setup onAbort correctly, OnFinish can still be triggered
      if (!process || process.status !== 'processing') return false
      if (!requestInfo.isProcessing) return false
      helpers.modifyRequestInfo(requestName as string, (draft) => {
        const { byId, ids } = draft.processes
        if (error) {
          draft.error = error
        }
        byId[processId].status = status

        byId[processId].metadata = metadata || {}
        if (processingType === 'SingleProcessing') {
          draft.isProcessing = false
          ids.forEach((reqId) => {
            if (reqId !== processId) {
              byId[reqId].status = 'aborted'
            }
          })
        } else {
          draft.isProcessing = draft.isProcessing = getIsProcessing(
            requestName as string,
            byId,
            ids
          )
        }
      })

      return true
    },
    ON_CANCEL(payload) {
      const { requestName, processId, keepInState } = payload
      const process = helpers.getProcessInfo(requestName as string, processId)
      const { status } = process
      if (!isCancellableStatus(status)) {
        return false
      }

      helpers.modifyRequestInfo(requestName as string, (draft: RequestInfo) => {
        const { byId, ids } = draft.processes
        byId[processId].status = 'cancelled'
        byId[processId].keepInStateOnCancel = keepInState
        draft.isProcessing = draft.isProcessing = getIsProcessing(
          requestName as string,
          byId,
          ids
        )
      })
      return true
    }
  }

  return processReducer
}

export default getReducer
