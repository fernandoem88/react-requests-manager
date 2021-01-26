import { useState, useRef, useEffect } from 'react'
import { shallowEqual } from 'shallow-utils'
import { StateManagerStore } from 'state-manager-store'
import createStore from './store'
import { RequestState, Subject, GetSelectorParam } from 'types'

import { useForceUpdate } from '../hooks.ts'
import getHelpers, { copy, mapRecord } from './helpers'

const useShallowEqualRef = <Value = undefined>(value: Value) => {
  const ref = useRef(value)
  if (!shallowEqual(value, ref.current)) {
    ref.current = value
  }
  return ref
}

const createContextsGroup = <
  Configurators extends Record<any, (store: any, name: string) => any>
>(
  groupName: string,
  configurators: Configurators
) => {
  type Contexts = Configurators
  type ContextKey = keyof Contexts
  type Requests<Ctx extends ContextKey> = ReturnType<Contexts[Ctx]> extends {
    requests: infer R
  }
    ? R
    : any

  type Actions<Ctx extends ContextKey> = ReturnType<Contexts[Ctx]> extends {
    actions: infer R
  }
    ? R
    : any
  type RequestKey<Ctx extends ContextKey> = keyof Requests<Ctx>
  type RequestsParams<
    Ctx extends ContextKey,
    K extends RequestKey<Ctx>
  > = Requests<Ctx>[K] extends (...params: infer Params) => any
    ? Params[0]
    : undefined
  const store = createStore()
  const dispatcher = new Subject()

  type ContextValue<Ctx extends keyof Contexts> = {
    requests: Requests<Ctx>
    actions: Actions<Ctx>
    getRequestsState: () => {
      [K in RequestKey<Ctx>]: RequestState<RequestsParams<Ctx, K>>
    }
    helpers: ReturnType<typeof getHelpers>
  }
  const createContext = <Ctx extends ContextKey>(
    configurator: Configurators[Ctx],
    contextName: Ctx
  ) => {
    const { contextId, requests, actions } = configurator(
      store,
      contextName as string
    )
    const helpers = getHelpers(store, contextId)
    helpers.setContextDispatcher(dispatcher)
    const getRequestsState = () =>
      helpers.getRequests() as {
        [K in RequestKey<Ctx>]: RequestState<RequestsParams<Ctx, K>>
      }

    return {
      requests: requests as Requests<Ctx>,
      actions: actions as Actions<Ctx>,
      getRequestsState,
      helpers
    }
  }

  const contexts = mapRecord(configurators, (configurator, ctx) => {
    return createContext<typeof ctx>(configurator, ctx)
  }) as { [Ctx in ContextKey]: ContextValue<Ctx> }

  const getAllStates = () =>
    mapRecord(contexts, (ctx) => ctx.getRequestsState()) as {
      [Ctx in ContextKey]: {
        [K in RequestKey<Ctx>]: RequestState<RequestsParams<Ctx, K>>
      }
    }

  const useRequests = <R extends any>(
    selector: (
      reqs: {
        [Ctx in keyof Contexts]: {
          [K in RequestKey<Ctx>]: RequestState<RequestsParams<Ctx, K>>
        }
      }
    ) => R
  ) => {
    const [state, setState] = useState(() => selector(getAllStates()) as any)
    const getStateRef = useRef(() => state)
    getStateRef.current = () => state
    const selectorRef = useRef(selector)
    useEffect(() => {
      mapRecord(contexts, (ctx) => ctx.helpers.updateSubscribersCount(1))
      return () => {
        mapRecord(contexts, (ctx) => ctx.helpers.updateSubscribersCount(-1))
      }
    }, [])

    useEffect(() => {
      const subscr = dispatcher.subscribe(() => {
        const newValue = selectorRef.current(getAllStates() as any)
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

  const bindToStateManager = <
    SMState = any,
    SMStore extends StateManagerStore<SMState> = StateManagerStore<SMState>
  >(
    stateManagerStore: SMStore
  ) => {
    const getCombinedState = () => ({
      state: stateManagerStore.getState(),
      requests: getAllStates()
    })
    const useSelector = <
      Selector extends (
        state: SMState,
        requests: {
          [Ctx in ContextKey]: {
            [K in RequestKey<Ctx>]: RequestState<RequestsParams<Ctx, K>>
          }
        },
        ...params: [any]
      ) => any
    >(
      selector: Selector,
      ...[params]: GetSelectorParam<Selector>
    ) => {
      // am using useState to not define the initial state again
      const [initialCombined] = useState(getCombinedState)
      const selectedValueRef = useRef({
        value: copy(
          selector(initialCombined.state, initialCombined.requests, params)
        ) as ReturnType<Selector>
      })
      // checkUpdate returns true if the selected value is updated
      const { current: checkUpdate } = useRef(() => {
        const combined = getCombinedState()
        const newSelectedValue = selector(
          combined.state,
          combined.requests,
          parameter
        )
        const isEqual = shallowEqual(
          newSelectedValue,
          selectedValueRef.current.value
        )
        if (isEqual) return false
        selectedValueRef.current = { value: copy(newSelectedValue) }
        return true
      })
      // if shouldCheckUpdateInMainBodyRef.current is true, we will check for update in the body of this hook not in the useEffect
      const shouldCheckUpdateInMainBodyRef = useRef(true)
      // const shouldCheckUpdateInUseEffectRef = useRef(false)
      const paramsRef = useShallowEqualRef(params)
      const parameter = paramsRef.current
      if (shouldCheckUpdateInMainBodyRef.current) {
        // shouldCheckUpdateInUseEffectRef.current = false
        checkUpdate()
      } else {
        // it's false only when there was an update in useEffect so to avoid checking it twice
        shouldCheckUpdateInMainBodyRef.current = true
      }
      const forceUpdate = useForceUpdate()
      // useEffect(() => {
      //   shouldCheckUpdateInUseEffectRef.current = true
      // })
      useEffect(() => {
        const doUpdate = (shouldUpdate: boolean) => {
          if (shouldUpdate) {
            shouldCheckUpdateInMainBodyRef.current = false
            forceUpdate()
          }
        }
        const subs1 = stateManagerStore.subscribe(() => {
          doUpdate(checkUpdate())
        })
        const subs2 = dispatcher.subscribe(() => {
          doUpdate(checkUpdate())
        })
        return () => {
          subs1.unsubscribe()
          subs2.unsubscribe()
        }
      }, [parameter])
      return selectedValueRef.current.value
    }
    const createNamedSelectorHook = <Selectors extends Record<any, any>>(
      selectors: Selectors
    ) => {
      const useNamedSelector = <Key extends keyof Selectors>(key: Key) => {
        return selectors[key]
      }
      return useNamedSelector
    }
    const createSelectorHook = () => useSelector
    return { createSelectorHook, createNamedSelectorHook }
  }

  return {
    requestsManager: mapRecord(
      contexts,
      ({ requests, actions, getRequestsState }) => ({
        requests,
        actions,
        getRequests: getRequestsState
      })
    ) as {
      [Ctx in ContextKey]: {
        requests: Requests<Ctx>
        actions: Actions<Ctx>
      }
    },
    useRequests,
    getState: getAllStates,
    bindToStateManager
  }
}

export default createContextsGroup
