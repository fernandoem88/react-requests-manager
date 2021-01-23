import { Store, RequestUtilsStart } from 'types'
import getHelpers from '../helpers'

type GetRequestParams<Request> = Request extends (
  utils: any,
  ...args: infer Params
) => any
  ? Params
  : []
export default (store: Store) =>
  function Multi<
    MultiRequest extends (
      utils: RequestUtilsStart<any>,
      ...params: [any]
    ) => Promise<void | false>
  >(request: MultiRequest) {
    type Request = (
      utils: RequestUtilsStart<any>,
      ...params: GetRequestParams<MultiRequest>
    ) => Promise<void | false>
    return async function MultiProcessing(
      this: { contextId: string; requestName: string },
      utils: RequestUtilsStart<any>,
      ...params: GetRequestParams<MultiRequest>
    ) {
      const contextId = this.contextId
      const requestName = this.requestName
      if (!contextId) {
        throw new Error('contextId not undefined in function: MultiProcessing')
      }
      const helpers = getHelpers(store, contextId)
      helpers.modifyRequestInfo(requestName, (draft) => {
        draft.type = 'MultiProcesses'
      })
      const prom = request(utils, params[0])
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
