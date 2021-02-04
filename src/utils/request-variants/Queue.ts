import {
  Store,
  RequestUtilsQueue,
  RequestUtils,
  Get2ndParams,
  Request,
  RequestWithNoParams
} from 'types'
import getHelpers from '../helpers'
import getReducer from '../reducer'

const getRequestUtilsQueue = <Params>(
  contextId: string,
  requestName: string,
  utils: RequestUtils<Params>,
  store: Store
): RequestUtilsQueue<Params> => {
  const stateReducer = getReducer(store, contextId)
  const helpers = getHelpers(store, contextId)
  helpers.modifyRequestInfo(requestName, (draft) => {
    draft.type = 'QueueType'
  })

  const addToQueue = (
    requestName: string,
    processId: string,
    onStart?: () => void
  ) => {
    const shouldDispatch = stateReducer.ON_SUSPEND({
      requestName,
      processId
    })

    let resolver: any = () => {}
    const promiseBlocker = new Promise<void>((resolve) => {
      resolver = () => {
        utils.start(onStart)
        resolve()
        helpers.deleteResolver(processId)
      }
    })
    helpers.addResolver(processId, resolver)
    if (shouldDispatch) {
      helpers.dispatchToHooks({
        type: 'ON_SUSPEND',
        payload: { requestName, processId }
      })
    } else {
      const process = helpers.getProcessInfo(requestName, processId)
      if (process.status === 'created') {
        // no other processes in queue, so this one should start immediately
        resolver()
      }
    }
    return promiseBlocker
  }

  const { start, ...commonUtils } = utils
  const inQueue: RequestUtilsQueue<any>['inQueue'] = (onStart) => {
    const process = utils.getProcessState()
    return addToQueue(requestName, process.id, onStart)
  }
  return { ...commonUtils, inQueue }
}

export default () =>
  function Queue<
    Params = undefined,
    QueueRequest extends (
      utils: RequestUtilsQueue<Params>,
      params: Params
    ) => Promise<void | false> = (
      utils: RequestUtilsQueue<Params>,
      params: Params
    ) => Promise<void | false>
  >(request: QueueRequest) {
    return async function QueueProcess(
      this: { contextId: string; requestName: string; store: Store },
      utils: RequestUtils<Params>,
      ...params: Get2ndParams<QueueRequest>
    ) {
      const contextId = this.contextId
      const requestName = this.requestName
      const store = this.store
      if (!contextId) {
        throw new Error('contextId is undefined in Queue wrapper')
      }
      if (!store) {
        throw new Error('store is undefined in Queue wrapper')
      }

      const utilsQueue = getRequestUtilsQueue<Params>(
        contextId,
        requestName,
        utils,
        store
      )
      const prom = request(utilsQueue, params[0] as Params)
      const helpers = getHelpers(store, contextId)
      helpers.handleRequestErrors(utilsQueue, prom)
    } as Get2ndParams<QueueRequest> extends []
      ? RequestWithNoParams
      : Request<Get2ndParams<QueueRequest>[0]>
  }
