import { Store, RequestUtilsStart } from 'types'
import getHelpers from '../helpers'

type GetRequestParams<Request> = Request extends (
  utils: any,
  ...args: infer Params
) => any
  ? Params
  : []

export default function Multi<
  Params = undefined,
  MultiRequest extends (
    utils: RequestUtilsStart<Params>,
    params: Params
  ) => Promise<void | false> = (
    utils: RequestUtilsStart<Params>,
    params: Params
  ) => Promise<void | false>
>(request: MultiRequest) {
  type Args = GetRequestParams<MultiRequest>
  type Request = (
    utils: RequestUtilsStart<Args[0]>,
    ...params: Args
  ) => Promise<void | false>
  return async function MultiProcessing(
    this: { contextId: string; requestName: string; store: Store },
    utils: RequestUtilsStart<Params>,
    ...params: Args
  ) {
    const contextId = this.contextId
    const requestName = this.requestName
    const store = this.store
    if (!contextId) {
      throw new Error('contextId is undefined in function: MultiProcessing')
    }
    if (!store) {
      throw new Error('store is undefined in function: MultiProcessing')
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
