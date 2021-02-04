import {
  Store,
  RequestUtils,
  Get2ndParams,
  Request,
  RequestWithNoParams
} from 'types'
import getHelpers from '../helpers'

export default () =>
  function Single<
    Params = undefined,
    SingleRequest extends (
      utils: RequestUtils<Params>,
      params: Params
    ) => Promise<void | false> = (
      utils: RequestUtils<Params>,
      params: Params
    ) => Promise<void | false>
  >(request: SingleRequest) {
    return async function SingleProcess(
      this: { contextId: string; requestName: string; store: Store },
      utils: RequestUtils<Params>,
      ...params: Get2ndParams<SingleRequest>
    ) {
      const contextId = this.contextId
      const store = this.store
      if (!contextId) {
        throw new Error('contextId is undefined in function: SingleType')
      }
      if (!store) {
        throw new Error('store is undefined in function: SingleType')
      }

      const prom = request(utils, params[0] as Params)
      const helepers = getHelpers(store, contextId)
      helepers.handleRequestErrors(utils, prom)
    } as Get2ndParams<SingleRequest> extends []
      ? RequestWithNoParams
      : Request<Get2ndParams<SingleRequest>[0]>
  }
