import { useRef } from 'react'
import { shallowEqual } from 'shallow-utils'

const useShallowEqualRef = <Value = undefined>(value: Value) => {
  const ref = useRef(value)
  if (!shallowEqual(value, ref.current)) {
    ref.current = value
  }
  return ref
}

export default useShallowEqualRef
