import { useState, useRef, useEffect, useCallback } from 'react'
import { shallowEqual } from 'shallow-utils'
import { StateManagerStore } from 'state-manager-store'
import { RequestState, Get3rdParams, Get2ndParams } from 'types'

import createStore from './store'
import { Subject } from './subject'

import { useForceUpdate, useShallowEqualRef } from '../hooks.ts'
import getHelpers, { copy, mapRecord } from './helpers'

const createContextsGroup = () => <
  Configurators extends Record<any, (store: any, name: string) => any>
>(
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

  type RequestsState = {
    [Ctx in keyof Contexts]: {
      [K in RequestKey<Ctx>]: RequestState<RequestsParams<Ctx, K>>
    }
  }
  const getAllRequestsStates = () =>
    mapRecord(contexts, (ctx) => ctx.getRequestsState()) as RequestsState
  const useRequests = <
    Selector extends (reqs: RequestsState, params: any) => any
  >(
    selector: Selector,
    ...args: Get2ndParams<Selector>
  ) => {
    const [params] = args
    // am using useState to not define the initial state again
    const [initialReqs] = useState<RequestsState>(getAllRequestsStates)
    const [initialSelected] = useState(
      () => copy(selector(initialReqs, params)) as ReturnType<Selector>
    )
    const selectorRef = useRef(selector)
    selectorRef.current = selector
    const selectedValueRef = useRef({
      value: initialSelected
    })
    // checkUpdate returns true if the selected value is updated
    const checkUpdate = useCallback((parameter: any) => {
      const reqs = getAllRequestsStates() as RequestsState
      const newSelectedValue = selectorRef.current(reqs, parameter)
      const isEqual = shallowEqual(
        newSelectedValue,
        selectedValueRef.current.value
      )
      if (isEqual) return false
      selectedValueRef.current = { value: copy(newSelectedValue) }
      return true
    }, [])
    // if shouldCheckUpdateInMainBodyRef.current is true, we will check for update in the body of this hook not in the useEffect
    const shouldCheckUpdateInMainBodyRef = useRef(true)
    // const shouldCheckUpdateInUseEffectRef = useRef(false)
    const paramsRef = useShallowEqualRef(params)

    if (shouldCheckUpdateInMainBodyRef.current) {
      // shouldCheckUpdateInUseEffectRef.current = false
      checkUpdate(paramsRef.current)
    } else {
      // it's false only when there was an update in useEffect so to avoid checking it twice
      shouldCheckUpdateInMainBodyRef.current = true
    }
    const forceUpdate = useForceUpdate()
    // useEffect(() => {
    //   shouldCheckUpdateInUseEffectRef.current = true
    // })
    useEffect(() => {
      mapRecord(contexts, (ctx) => ctx.helpers.updateSubscribersCount(1))
      return () => {
        mapRecord(contexts, (ctx) => ctx.helpers.updateSubscribersCount(-1))
      }
    }, [])
    useEffect(() => {
      // const dispatcher = helpers.getDispatcher()
      const doUpdate = (shouldUpdate: boolean) => {
        if (shouldUpdate) {
          shouldCheckUpdateInMainBodyRef.current = false
          forceUpdate()
        }
      }
      const subscription = dispatcher.subscribe(() => {
        doUpdate(checkUpdate(paramsRef.current))
      })
      return () => {
        subscription.unsubscribe()
      }
    }, [checkUpdate])
    return selectedValueRef.current.value
  }

  const bindToStateManager = <SMStore extends StateManagerStore<any>>(
    stateManagerStore: SMStore
  ) => {
    const getCombinedState = () => ({
      state: stateManagerStore.getState(),
      requests: getAllRequestsStates()
    })
    type SMState = ReturnType<SMStore['getState']>
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
      ...args: Get3rdParams<Selector>
    ) => {
      const [params] = args
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
    manager: mapRecord(contexts, ({ requests, actions, getRequestsState }) => ({
      requests,
      actions,
      getRequests: getRequestsState
    })) as {
      [Ctx in ContextKey]: {
        requests: Requests<Ctx>
        actions: Actions<Ctx>
      }
    },
    useRequests,
    getState: getAllRequestsStates,
    bindToStateManager
  }
}

export default createContextsGroup
