import {
  Store,
  RequestUtils,
  Get2ndParams,
  Request,
  RequestWithNoParams
} from 'types'
import getHelpers from '../helpers'

export default () =>
  function Multi<
    Params = undefined,
    MultiRequest extends (
      utils: RequestUtils<Params>,
      params: Params
    ) => Promise<void | false> = (
      utils: RequestUtils<Params>,
      params: Params
    ) => Promise<void | false>
  >(request: MultiRequest) {
    return async function MultiProcess(
      this: { contextId: string; requestName: string; store: Store },
      utils: RequestUtils<Params>,
      ...params: Get2ndParams<MultiRequest>
    ) {
      const contextId = this.contextId
      const requestName = this.requestName
      const store = this.store
      if (!contextId) {
        throw new Error('contextId is undefined in function: MultiType')
      }
      if (!store) {
        throw new Error('store is undefined in function: MultiType')
      }
      const helpers = getHelpers(store, contextId)
      helpers.modifyRequestInfo(requestName, (draft) => {
        draft.type = 'MultiType'
      })
      const prom = request(utils, params[0] as Params)
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
    } as Get2ndParams<MultiRequest> extends []
      ? RequestWithNoParams
      : Request<Get2ndParams<MultiRequest>[0]>
  }
