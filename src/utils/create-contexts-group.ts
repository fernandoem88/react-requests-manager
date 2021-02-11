import { useState, useRef, useEffect, useCallback } from 'react'
import { shallowEqual } from 'shallow-utils'
import {
  RequestState,
  Get3rdParams,
  Get2ndParams,
  StateManagerStore
} from 'types'

import createStore from './store'
import { Subject } from './subject'

import { useForceUpdate, useShallowEqualRef } from '../hooks.ts'
import getHelpers, { copy, mapRecord, doUnsubscribe } from './helpers'

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
    const checkUpdate = useCallback(() => {
      const parameter = paramsRef.current
      const reqs = getAllRequestsStates() as RequestsState
      const newSelectedValue = selectorRef.current(reqs, parameter)
      const isEqual = shallowEqual(
        { value: newSelectedValue },
        { value: selectedValueRef.current.value }
      )
      if (isEqual) return false
      selectedValueRef.current = { value: copy(newSelectedValue) }
      return true
    }, [])
    // if shouldCheckUpdateInMainBodyRef.current is true, we will check for update in the body of this hook not in the useEffect
    const shouldCheckUpdateInMainBodyRef = useRef(false)
    // const shouldCheckUpdateInUseEffectRef = useRef(false)
    const paramsRef = useShallowEqualRef(params)

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
      mapRecord(contexts, (ctx) => ctx.helpers.updateSubscribersCount(1))
      return () => {
        mapRecord(contexts, (ctx) => ctx.helpers.updateSubscribersCount(-1))
      }
    }, [])
    useEffect(() => {
      const doUpdate = () => {
        const shouldUpdate = checkUpdate()
        if (shouldUpdate) {
          shouldCheckUpdateInMainBodyRef.current = false
          forceUpdate()
        }
      }
      doUpdate() // first update
      const subscription = dispatcher.subscribe(doUpdate)
      return subscription.unsubscribe
    }, [checkUpdate, forceUpdate])
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
      const selectorRef = useRef(selector)
      selectorRef.current = selector
      const [initialCombined] = useState(getCombinedState)
      const [initialSelectedValue] = useState(
        () =>
          copy(
            selector(initialCombined.state, initialCombined.requests, params)
          ) as ReturnType<Selector>
      )
      const selectedValueRef = useRef({
        value: initialSelectedValue
      })
      const paramsRef = useShallowEqualRef(params)
      // checkUpdate returns true if the selected value is updated
      const checkUpdate = useCallback(() => {
        const combined = getCombinedState()
        const newSelectedValue = selectorRef.current(
          combined.state,
          combined.requests,
          paramsRef.current
        )
        const isEqual = shallowEqual(
          { value: newSelectedValue },
          { value: selectedValueRef.current.value }
        )
        if (isEqual) return false
        selectedValueRef.current = { value: copy(newSelectedValue) }
        return true
      }, [])
      // if shouldCheckUpdateInMainBodyRef.current is true, we will check for update in the body of this hook not in the useEffect
      const shouldCheckUpdateInMainBodyRef = useRef(false)
      // const shouldCheckUpdateInUseEffectRef = useRef(false)
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
        const doUpdate = () => {
          const shouldUpdate = checkUpdate()
          if (shouldUpdate) {
            shouldCheckUpdateInMainBodyRef.current = false
            forceUpdate()
          }
        }
        doUpdate() // first update
        // state manager
        const smSubscription = stateManagerStore.subscribe(doUpdate)
        // requests manager
        const rmSubscription = dispatcher.subscribe(doUpdate)
        return () => {
          doUnsubscribe(smSubscription)
          rmSubscription.unsubscribe()
        }
      }, [checkUpdate, forceUpdate])
      return selectedValueRef.current.value
    }

    return { useSelector } // { useSelector, createNamedSelectorHook }
  }

  return {
    requests: mapRecord(contexts, ({ requests }: any) => requests) as {
      [K in ContextKey]: Requests<K>
    },
    extraActions: mapRecord(contexts, ({ actions }: any) => actions) as {
      [K in ContextKey]: Actions<K>
    },
    useRequests,
    getState: getAllRequestsStates,
    subscribe: (listener: () => void) => dispatcher.subscribe(listener),
    bindToStateManager
  }
}

export default createContextsGroup
