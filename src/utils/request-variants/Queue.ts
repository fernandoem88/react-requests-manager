import { Store, RequestUtilsQueue, RequestUtilsStart } from 'types'
import getHelpers from '../helpers'

type GetRequestParams<Request> = Request extends (
  utils: any,
  ...args: infer Params
) => any
  ? Params
  : []
export default (store: Store) =>
  function Queue<
    QueueRequest extends (
      utils: RequestUtilsQueue<any>,
      params: any
    ) => Promise<void | false>
  >(request: QueueRequest) {
    const getRequestUtils = (
      contextId: string,
      requestName: string,
      utils: RequestUtilsStart<any>
    ): RequestUtilsQueue<any> => {
      const helpers = getHelpers(store, contextId)
      helpers.modifyRequestInfo(requestName, (draft) => {
        draft.type = 'Queue'
      })

      const addToQueue = (
        requestName: string,
        processId: string,
        onStart?: (reducers: any) => void
      ) => {
        const {
          processes: { byId }
        } = helpers.modifyRequestInfo(requestName, (draft) => {
          // set status to suspended to show that it is waiting
          const {
            isProcessing,
            processes: { byId }
          } = draft
          if (isProcessing) {
            byId[processId].status = 'suspended'
          }
        })
        // eslint-ignore-next-line
        let resolver: any = () => {} // tslint-disable-line
        const blocker = new Promise<void>((resolve) => {
          resolver = (onStart: any) => {
            utils.start(onStart)
            resolve()
            helpers.deleteResolver(processId)
          }
        })

        helpers.addResolver(processId, resolver, onStart)
        if (byId[processId].status !== 'suspended') {
          // no other processes in queue, so this one should start immediately
          resolver(onStart)
        } else {
          helpers.dispatchToHooks({
            type: 'ON_SUSPEND',
            payload: { requestName, processId }
          })
        }
        return blocker
      }

      const { start, ...commonUtils } = utils
      const inQueue: RequestUtilsQueue<any>['inQueue'] = (onStart) => {
        const process = utils.getProcessState()
        return addToQueue(requestName, process.id, onStart)
      }
      return { ...commonUtils, inQueue }
    }

    type Request = (
      utils: RequestUtilsStart<any>,
      ...params: GetRequestParams<QueueRequest>
    ) => Promise<void | false>
    return async function Queue(
      this: { contextId: string; requestName: string },
      utils: RequestUtilsStart<any>,
      ...params: GetRequestParams<QueueRequest>
    ) {
      const contextId = this.contextId
      const requestName = this.requestName
      if (!contextId) {
        throw new Error('contextId undefined in Queue wrapper')
      }

      const asyncQueue = getRequestUtils(contextId, requestName, utils)
      const prom = request(asyncQueue, params[0])
      // handle cancel
      prom
        .then((result) => {
          if (result === false) {
            utils.cancel.bind({ skipDispatch: true })()
          }
        })
        .catch((err) => {
          if (err?.message === 'ON_CANCEL') {
            return
          }
          throw err
        })
    } as Request
  }
