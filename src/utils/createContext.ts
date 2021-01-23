import { useState, useRef, useEffect } from 'react'
import { shallowEqual } from 'shallow-utils'
import { ReduxStore } from 'redux-store'
import {
  Store,
  ProcessDispatcher,
  RequestState,
  Subject,
  GetSelectorParam
} from 'types'

import { useForceUpdate } from '../hooks.ts'
import getHelpers, { copy } from './helpers'

const useShallowEqualRef = <Value = undefined>(value: Value) => {
  const ref = useRef(value)
  if (!shallowEqual(value, ref.current)) {
    ref.current = value
  }
  return ref
}

const getContextCreator = <
  Requests extends Record<any, any>,
  Actions extends Record<any, any>
>(configs: {
  store: Store
  contextId: string
  requests: Requests
  actions: Actions
  initializeRequests: (name: string) => void
}) => {
  // type State = GetReducersState<Reducers>
  type RequestKey = keyof Requests
  type RequestsParams<K extends RequestKey> = Requests[K] extends (
    ...params: infer Params
  ) => any
    ? Params[0]
    : undefined
  const { store, contextId, requests, actions, initializeRequests } = configs

  const helpers = getHelpers(store, contextId)

  // const getRequest = <RequestName extends RequestKey>(req: RequestName) =>
  //   helpers.getRequestState(req as any) as RequestState<
  //     RequestsParams<RequestName>
  //   >

  /**
   *
   * @param contextName
   * @param $context
   */
  const createContext = <GD extends ProcessDispatcher | undefined>(
    contextName: string,
    groupDispatcher: GD = undefined as GD
  ) => {
    const contextId = helpers.getContextInfo().id
    initializeRequests(contextName)
    // helpers.setContextName(contextName);

    if (groupDispatcher) {
      helpers.setContextSubject(groupDispatcher as ProcessDispatcher)
    } else {
      helpers.setContextSubject(new Subject())
    }

    const getRequests = () =>
      helpers.getRequests() as {
        [K in RequestKey]: RequestState<RequestsParams<K>>
      }

    const useRequests = <R extends any>(
      selector: (
        reqs: { [K in RequestKey]: RequestState<RequestsParams<K>> }
      ) => R
    ) => {
      const [state, setState] = useState(() =>
        selector(helpers.getRequests() as any)
      )
      const getStateRef = useRef(() => state)
      getStateRef.current = () => state
      const selectorRef = useRef(selector)
      useEffect(() => {
        helpers.updateSubscribersCount(1)
        return () => {
          helpers.updateSubscribersCount(-1)
        }
      }, [])

      useEffect(() => {
        const $context = helpers.getDispatcher()
        const subscr = $context.subscribe((action) => {
          if (action.contextId !== contextId) return
          const newValue = selectorRef.current(helpers.getRequests() as any)
          const isEqual = shallowEqual(getStateRef.current(), newValue)
          if (isEqual) return
          setState(newValue)
        })
        return () => {
          subscr.unsubscribe()
        }
      }, [])
      return state
    }

    const useRequest = <K extends RequestKey, R extends any>(
      requestName: K,
      selector: (reqState: RequestState<RequestsParams<K>>) => R
    ) => {
      const [state, setState] = useState(() =>
        selector(helpers.getRequestState(requestName as string))
      )
      const getStateRef = useRef(() => state)
      getStateRef.current = () => state
      const selectorRef = useRef(selector)
      useEffect(() => {
        helpers.updateSubscribersCount(1)
        return () => {
          helpers.updateSubscribersCount(-1)
        }
      }, [])
      useEffect(() => {
        const $context = helpers.getDispatcher()
        const subscr = $context.subscribe((action) => {
          if (action.contextId !== contextId) return
          const newValue = selectorRef.current(
            helpers.getRequestState(requestName as string)
          )
          const isEqual = shallowEqual(getStateRef.current(), newValue)
          if (isEqual) return
          setState(newValue)
        })
        return () => {
          subscr.unsubscribe()
        }
      }, [requestName])
      return state
    }

    // const getAllContexts = () => {
    //   const ctxIds = Object.keys(store.contexts)
    //   return ctxIds.reduce((acc, key) => {
    //     return { ...acc, [key]: { ...store.contexts[key].info } }
    //   }, {} as any)
    // }

    const bindToReduxStore = <ReduxState = any>(
      reduxStore: ReduxStore<ReduxState>
    ) => {
      const getCombinedState = () => ({
        state: reduxStore.getState(),
        requests: getRequests()
      })
      const useSelector = <
        Selector extends (
          combined: {
            state: ReduxState
            requests: {
              [K in RequestKey]: RequestState<RequestsParams<K>>
            }
          },
          params: any
        ) => any
      >(
        selector: Selector,
        ...[params]: GetSelectorParam<Selector>
      ) => {
        // am using useState to not define the initial state again
        const [initialCombined] = useState(getCombinedState)
        const selectedValueRef = useRef({
          value: copy(selector(initialCombined, params)) as ReturnType<Selector>
        })
        // checkUpdate returns true if the selected value is updated
        const { current: checkUpdate } = useRef(() => {
          const combined = getCombinedState()
          const newSelectedValue = selector(combined, parameter)
          const isEqual = shallowEqual(
            newSelectedValue,
            selectedValueRef.current.value
          )
          if (isEqual) return false
          selectedValueRef.current = { value: copy(newSelectedValue) }
          return true
        })
        // if shouldCheckUpdateRef.current is true, we will check for update in the body of this hook not in the useEffect
        const shouldCheckUpdateRef = useRef(true)
        const paramsRef = useShallowEqualRef(params)
        const parameter = paramsRef.current
        if (shouldCheckUpdateRef.current) {
          checkUpdate()
        } else {
          // it's false only when there was an update in useEffect so to avoid checking it twice
          shouldCheckUpdateRef.current = true
        }
        const forceUpdate = useForceUpdate()
        useEffect(() => {
          const $context = helpers.getDispatcher()
          const doUpdate = (shouldUpdate: boolean) => {
            if (shouldUpdate) {
              shouldCheckUpdateRef.current = false
              forceUpdate()
            }
          }
          const subs1 = reduxStore.subscribe(() => {
            doUpdate(checkUpdate())
          })
          const subs2 = $context.subscribe((action) => {
            if (action.contextId !== contextId) return
            doUpdate(checkUpdate())
          })
          return () => {
            subs1.unsubscribe()
            subs2.unsubscribe()
          }
        }, [parameter])
        return selectedValueRef.current.value
      }
      const createNamedSelectorHook = () => {
        const useNamedSelector = () => {
          return null
        }
        return useNamedSelector
      }

      // const useSelectorGroup = () => {
      //   return null
      // }

      // const createSelectorHook = (): GD extends undefined
      //   ? typeof useSelector
      //   : typeof useSelectorGroup =>
      //   (groupDispatcher ? useSelectorGroup : useSelector) as any
      const createSelectorHook = () => useSelector
      return { createSelectorHook, createNamedSelectorHook }
    }

    return {
      // entities
      actions,
      requests,
      // helpers
      getRequests,
      bindToReduxStore,
      // hooks
      useRequest,
      useRequests
    }
  }
  return createContext
}

export default getContextCreator
