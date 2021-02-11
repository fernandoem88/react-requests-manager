import { useState, useRef, useEffect, useCallback } from 'react'
import {
  RequestState,
  Get3rdParams,
  Get2ndParams,
  StateManagerStore
} from 'types'
import { shallowEqual } from 'shallow-utils'
import createStore from './store'
import { Subject } from './subject'

import { useForceUpdate, useShallowEqualRef } from '../hooks.ts'
import getHelpers, { copy, doUnsubscribe } from './helpers'

const createContext = () => <
  Configurator extends (store: any, name: string) => any
>(
  name: string,
  configurator: Configurator
) => {
  const store = createStore()
  const { contextId, requests, actions } = configurator(store, name)

  type Requests = ReturnType<Configurator> extends { requests: infer R }
    ? R
    : any
  type ExtraActions = ReturnType<Configurator> extends { actions: infer R }
    ? R
    : any
  type RequestKey = keyof Requests
  type RequestsParams<K extends RequestKey> = Requests[K] extends (
    ...params: infer Params
  ) => any
    ? Params[0]
    : undefined

  const dispatcher = new Subject()
  const helpers = getHelpers(store, contextId)
  helpers.setContextDispatcher(dispatcher)
  const getRequestsState = () =>
    helpers.getRequests() as {
      [K in RequestKey]: RequestState<RequestsParams<K>>
    }

  type RequestsState = { [K in RequestKey]: RequestState<RequestsParams<K>> }
  const useRequests = <
    Selector extends (reqs: RequestsState, params: any) => any
  >(
    selector: Selector,
    ...args: Get2ndParams<Selector>
  ) => {
    const [params] = args
    // am using useState to not define the initial state again

    const [initialReqs] = useState<RequestsState>(helpers.getRequests as any)

    const selectorRef = useRef(selector)
    selectorRef.current = selector
    const [initialSelectedValue] = useState(() => {
      return copy(selector(initialReqs, params)) as ReturnType<Selector>
    })
    const selectedValueRef = useRef({
      value: initialSelectedValue
    })
    // checkUpdate returns true if the selected value is updated
    const checkUpdate = useCallback(() => {
      const reqs = helpers.getRequests() as RequestsState
      const newSelectedValue = selectorRef.current(reqs, paramsRef.current)
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

    useEffect(() => {
      helpers.updateSubscribersCount(1)
      return () => {
        helpers.updateSubscribersCount(-1)
      }
    }, [])

    useEffect(() => {
      const dispatcher = helpers.getDispatcher()
      const doUpdate = () => {
        const shouldUpdate = checkUpdate()
        if (shouldUpdate) {
          shouldCheckUpdateInMainBodyRef.current = false
          forceUpdate()
        }
      }

      doUpdate() // first update
      const subscription = dispatcher.subscribe((action) => {
        if (action.contextId !== contextId) return
        doUpdate()
      })
      return subscription.unsubscribe
    }, [checkUpdate, forceUpdate])
    return selectedValueRef.current.value as ReturnType<Selector>
  }

  const bindToStateManager = <SMState>(
    stateManagerStore: StateManagerStore<SMState>
  ) => {
    const getCombinedState = () => {
      return {
        state: stateManagerStore.getState(),
        requests: getRequestsState()
      }
    }
    // type SMStore = StateManagerStore<SMState>
    const useSelector = <
      Selector extends (
        state: SMState,
        requests: {
          [K in RequestKey]: RequestState<RequestsParams<K>>
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

      const selectorRef = useRef(selector)
      selectorRef.current = selector
      const [initialSelectedValue] = useState<ReturnType<Selector>>(() => {
        return copy(
          selector(initialCombined.state, initialCombined.requests, params)
        ) as ReturnType<Selector>
      })
      const selectedValueRef = useRef<{ value: ReturnType<Selector> }>({
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

      useEffect(() => {
        helpers.updateSubscribersCount(1)
        return () => {
          helpers.updateSubscribersCount(-1)
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
        const dispatcher = helpers.getDispatcher()
        const smSubscription = stateManagerStore.subscribe(doUpdate)
        const rmSubscription = dispatcher.subscribe((action) => {
          if (action.contextId !== contextId) return
          doUpdate()
        })

        return () => {
          doUnsubscribe(smSubscription)
          rmSubscription.unsubscribe()
        }
      }, [checkUpdate, forceUpdate])

      return selectedValueRef.current.value
    }

    return { useSelector } // { createSelectorHook, createNamedSelectorHook }
  }

  return {
    requests: requests as Requests,
    extraActions: actions as ExtraActions,
    useRequests,
    getState: getRequestsState,
    subscribe: (listener: () => void) => dispatcher.subscribe(listener),
    bindToStateManager
  }
}

export default createContext
