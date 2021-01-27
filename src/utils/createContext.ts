import { useState, useRef, useEffect } from 'react'
import { shallowEqual } from 'shallow-utils'
import { StateManagerStore } from 'state-manager-store'
import createStore from './store'
import { Subject } from './subject'
import { RequestState, GetSelectorParam } from 'types'

import { useForceUpdate } from '../hooks.ts'
import getHelpers, { copy } from './helpers'

const useShallowEqualRef = <Value = undefined>(value: Value) => {
  const ref = useRef(value)
  if (!shallowEqual(value, ref.current)) {
    ref.current = value
  }
  return ref
}

const createContext = <Configurator extends (store: any, name: string) => any>(
  name: string,
  configurator: Configurator
) => {
  const store = createStore()
  const { contextId, requests, actions } = configurator(store, name)

  type Requests = ReturnType<Configurator> extends { requests: infer R }
    ? R
    : any
  type Actions = ReturnType<Configurator> extends { actions: infer R } ? R : any
  type RequestKey = keyof Requests
  type RequestsParams<K extends RequestKey> = Requests[K] extends (
    ...params: infer Params
  ) => any
    ? Params[0]
    : undefined

  const helpers = getHelpers(store, contextId)
  helpers.setContextDispatcher(new Subject())
  const getRequestsState = () =>
    helpers.getRequests() as {
      [K in RequestKey]: RequestState<RequestsParams<K>>
    }

  type RequestsState = { [K in RequestKey]: RequestState<RequestsParams<K>> }
  const useRequests = <
    Selector extends (reqs: RequestsState, ...params: [any]) => any
  >(
    selector: Selector,
    ...args: Selector extends (reqs: any, ...params: infer Params) => any
      ? Params[0] extends undefined
        ? []
        : Params
      : []
  ) => {
    const [params] = args
    // am using useState to not define the initial state again
    const [initialReqs] = useState<RequestsState>(helpers.getRequests as any)
    const selectedValueRef = useRef({
      value: copy(selector(initialReqs, params[0])) as ReturnType<Selector>
    })
    // checkUpdate returns true if the selected value is updated
    const { current: checkUpdate } = useRef(() => {
      const reqs = helpers.getRequests() as RequestsState
      const newSelectedValue = selector(reqs, parameter)
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
      helpers.updateSubscribersCount(1)
      return () => {
        helpers.updateSubscribersCount(-1)
      }
    }, [])
    useEffect(() => {
      const dispatcher = helpers.getDispatcher()
      const doUpdate = (shouldUpdate: boolean) => {
        if (shouldUpdate) {
          shouldCheckUpdateInMainBodyRef.current = false
          forceUpdate()
        }
      }
      const subscription = dispatcher.subscribe((action) => {
        if (action.contextId !== contextId) return
        doUpdate(checkUpdate())
      })
      return () => {
        subscription.unsubscribe()
      }
    }, [parameter])
    return selectedValueRef.current.value
  }

  const bindToStateManager = <SMStore extends StateManagerStore<any>>(
    stateManagerStore: SMStore
  ) => {
    const getCombinedState = () => ({
      state: stateManagerStore.getState(),
      requests: getRequestsState()
    })
    type SMState = ReturnType<SMStore['getState']>
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
      ...args: GetSelectorParam<Selector>
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
        const $context = helpers.getDispatcher()
        const doUpdate = (shouldUpdate: boolean) => {
          if (shouldUpdate) {
            shouldCheckUpdateInMainBodyRef.current = false
            forceUpdate()
          }
        }
        const subs1 = stateManagerStore.subscribe(() => {
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
    manager: {
      requests: requests as Requests,
      actions: actions as Actions
    },
    // hooks
    useRequests,
    // helpers
    getState: getRequestsState,
    bindToStateManager
  }
}

export default createContext
