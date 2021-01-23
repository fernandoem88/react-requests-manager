import { Store } from 'types'
import { mapRecord } from './helpers'

export default (store: Store) => <
  ContextCreators extends Record<
    any,
    (storeId: string, contextName: string) => any
  >
>(
  contextCreators: ContextCreators
) => {
  // 1 context => many actions
  type Context = keyof ContextCreators
  // selectors
  //
  const actions = mapRecord(contextCreators, (createContext, ctxName: any) =>
    createContext(store.id, ctxName)
  ) as { [Ctx in Context]: ReturnType<ContextCreators[Ctx]> }

  return { actions }
}
