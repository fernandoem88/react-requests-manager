import { Store, RequestUtilsStart, Get2ndParams, Request } from 'types'

export default () =>
  function Single<
    Params = undefined,
    SingleRequest extends (
      utils: RequestUtilsStart<Params>,
      params: Params
    ) => Promise<void | false> = (
      utils: RequestUtilsStart<Params>,
      params: Params
    ) => Promise<void | false>
  >(request: SingleRequest) {
    return async function SingleProcessing(
      this: { contextId: string; requestName: string; store: Store },
      utils: RequestUtilsStart<Params>,
      ...params: Get2ndParams<SingleRequest>
    ) {
      const contextId = this.contextId
      const store = this.store
      if (!contextId) {
        throw new Error('contextId is undefined in function: SingleProcessing')
      }
      if (!store) {
        throw new Error('store is undefined in function: SingleProcessing')
      }

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
    } as Request<Get2ndParams<SingleRequest>>
  }
