import { OmitKeysOfType, RequestState } from 'types'
import { mapRecord } from './helpers'

type MapSelectors<State, Reqs> = <
  Result,
  Selectors extends Record<
    any,
    (state: State, requests: Reqs, params: any) => any
  >
>(
  selectors: Selectors,
  select: (map: { [K in keyof Selectors]: ReturnType<Selectors[K]> }) => any
) => (state: State, reqs: Reqs, ...params: any) => Result

const mapSelectors = <
  Selectors extends Record<any, (state: any, requests: any, params: any) => any>
>(
  selectors: Selectors,
  select: (map: { [K in keyof Selectors]: ReturnType<Selectors[K]> }) => any
) => {
  type SelectorKey = keyof Selectors
  type SParam<K extends SelectorKey> = Selectors[K] extends (
    s: any,
    reqs: any,
    params: infer Params
  ) => any
    ? Params
    : undefined

  type RequiredKeys = OmitKeysOfType<(s: any, r: any) => any, Selectors>
  type SelectorsParams = {
    [K in keyof RequiredKeys]: SParam<K>
  }
  type LastParams = keyof SelectorsParams extends never ? [] : [SelectorsParams]

  return (
    state: any,
    reqs: Record<SelectorKey, RequestState>,
    ...params: LastParams
  ) => {
    const map = mapRecord(selectors, (selector, key) => {
      const selectedParams =
        key in params ? params[key as keyof typeof params] : undefined
      return selector(state, reqs, selectedParams as never)
    })
    return select(map)
  }
}
