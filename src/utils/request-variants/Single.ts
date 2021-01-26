import { Store, RequestUtilsStart } from 'types'

type GetRequestParams<Request> = Request extends (
  utils: any,
  ...args: infer Params
) => any
  ? Params
  : []

export default function Single<
  Params = undefined,
  SingleRequest extends (
    utils: RequestUtilsStart<Params>,
    params: Params
  ) => Promise<void | false> = (
    utils: RequestUtilsStart<Params>,
    params: Params
  ) => Promise<void | false>
>(request: SingleRequest) {
  //   type SingleRequest = typeof request
  type Request = (
    utils: RequestUtilsStart<Params>,
    ...params: GetRequestParams<SingleRequest>
  ) => Promise<void | false>
  return async function SingleProcessing(
    this: { contextId: string; requestName: string; store: Store },
    utils: RequestUtilsStart<Params>,
    ...params: GetRequestParams<SingleRequest>
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
  } as Request
}

const test = Single(async (utils, id: string) => {
  //
})
