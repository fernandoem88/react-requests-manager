import { Store, RequestUtilsStart, Get2ndParams, Request } from 'types'
import getHelpers from '../helpers'

export default () =>
  function Multi<
    Params = undefined,
    MultiRequest extends (
      utils: RequestUtilsStart<Params>,
      params: Params
    ) => Promise<void | false> = (
      utils: RequestUtilsStart<Params>,
      params: Params
    ) => Promise<void | false>
  >(request: MultiRequest) {
    return async function MultiProcessing(
      this: { contextId: string; requestName: string; store: Store },
      utils: RequestUtilsStart<Params>,
      ...params: Get2ndParams<MultiRequest>
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
        draft.type = 'MultiProcessing'
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
    } as Request<Get2ndParams<MultiRequest>>
  }
