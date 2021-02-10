import {
  Dictionary,
  ProcessInfo,
  ActionPayload,
  ActionType,
  RequestInfo,
  Store,
  ProcessStatus
} from 'types'
import getHelpers, { isCancellableStatus } from './helpers'

const getReducer = (store: Store, contextId: string) => {
  const isAbortableStatus = (status: ProcessStatus) =>
    status === 'processing' || status === 'suspended'
  const helpers = getHelpers(store, contextId)
  const getIsProcessing = (
    requestName: string,
    processes: Dictionary<ProcessInfo>,
    processIds: string[]
  ) => {
    const isProcessing = processIds.some(
      (id) => processes[id].status === 'processing'
    )
    const requestType = helpers.getRequestType(requestName as any)
    const hasSuspendedProcesss =
      requestType !== 'QueueType'
        ? false
        : processIds.some((id) => processes[id].status === 'suspended')
    return isProcessing || hasSuspendedProcesss
  }
  const processReducer: {
    [T in Exclude<ActionType, 'ON_STATE'>]: (
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
    ON_SUSPEND(payload) {
      const { requestName, processId } = payload
      let shouldDispatch = true
      helpers.modifyRequestInfo(requestName, (draft) => {
        // set status to suspended to show that it is waiting
        const {
          isProcessing,
          processes: { byId }
        } = draft
        if (isProcessing) {
          byId[processId].status = 'suspended'
          byId[processId].keepInStateOnAbort = true
        } else {
          shouldDispatch = false
        }
      })
      return shouldDispatch
    },
    ON_START(payload) {
      const { requestName, processId } = payload
      let shouldDispatch = true
      helpers.modifyRequestInfo(requestName as string, (draft) => {
        const { byId } = draft.processes
        const { status } = byId[processId]
        if (status === 'created' || status === 'suspended') {
          // by default all started processes are kept in state
          byId[processId].keepInStateOnAbort = true
          byId[processId].status = 'processing'
          draft.isProcessing = true
        } else {
          shouldDispatch = false
        }
      })
      return shouldDispatch
    },
    ON_ABORT(payload) {
      const { requestName, processId, reason, keepInState } = payload
      const process = helpers.getProcessInfo(requestName as string, processId)
      if (!process) return false
      const { status } = process
      if (!isAbortableStatus(status)) {
        if (status === 'created') {
          console.error(
            requestName,
            'abort a process after being created is not a good practice, please cancel it by returning false in the request body'
          )
          // delete process without dispatch
          helpers.modifyRequestInfo(requestName as string, (draft) => {
            const { byId, ids } = draft.processes
            draft.processes.ids = ids.filter((id) => id !== processId)
            delete byId[processId]
          })
        }
        return false
      }
      helpers.modifyRequestInfo(requestName as string, (draft) => {
        const { byId, ids } = draft.processes
        const process = byId[processId]
        const keepIt =
          keepInState !== undefined ? keepInState : process.keepInStateOnAbort
        if (keepIt) {
          process.status = 'aborted'
          if (reason) {
            const { metadata } = process
            metadata.abortReason = reason
          }
        } else {
          // if we are not keeping it in state so we should delete it
          draft.processes.ids = ids.filter((id) => id !== processId)
          delete byId[processId]
        }
        draft.isProcessing = getIsProcessing(
          requestName as string,
          byId,
          draft.processes.ids
        )
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
      let shouldDispatch = true
      helpers.modifyRequestInfo(requestName as string, (draft: RequestInfo) => {
        shouldDispatch = draft.error !== undefined
        draft.error = undefined
      })
      return shouldDispatch
    },
    ON_CLEAR_GROUP(payload) {
      let shouldDispatch = false
      helpers.modifyContextInfo(({ requests }) => {
        payload.requestNames.forEach((requestName: any) => {
          const draft = requests[requestName as string]
          if (!shouldDispatch && draft.error !== undefined) {
            shouldDispatch = true
          }
          draft.error = undefined
        })
      })
      return shouldDispatch
    },
    ON_FINISH(payload) {
      const {
        requestName,
        processId,
        status,
        processingType,
        metadata = {},
        error
      } = payload
      const requestInfo = helpers.getRequestInfo(requestName as string)
      const process = helpers.getProcessInfo(requestName as string, processId)
      // if someone called abort but did not setup onAbort correctly, OnFinish can still be triggered
      if (
        !requestInfo.isProcessing ||
        !process ||
        process.status !== 'processing'
      ) {
        if (process?.status === 'aborted') {
          if (process.handleAbortOnErrorCallback) {
            helpers.modifyRequestInfo(requestName as string, (draft) => {
              draft.error = error
            })
          }
        }
        return false
      }

      helpers.modifyRequestInfo(requestName as string, (draft) => {
        const { byId, ids } = draft.processes

        draft.error = error

        byId[processId].status = status

        const md = byId[processId].metadata || {}
        byId[processId].metadata = { ...md, ...metadata }

        if (processingType === 'SingleType') {
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

      let shouldDispatch = true

      helpers.modifyRequestInfo(requestName as string, (draft: RequestInfo) => {
        const { byId, ids } = draft.processes
        const isCreated = byId[processId].status === 'created'
        const shouldDeleteIt = isCreated || !keepInState
        if (shouldDeleteIt) {
          // if we are not keeping it in state so we should delete it
          draft.processes.ids = ids.filter((id) => id !== processId)
          delete byId[processId]
        } else {
          byId[processId].status = 'cancelled'
          byId[processId].keepInStateOnCancel = keepInState
        }
        if (isCreated) {
          shouldDispatch = false
        }
        draft.isProcessing = getIsProcessing(requestName as string, byId, ids)
      })
      return shouldDispatch
    }
  }

  return processReducer
}

export default getReducer
