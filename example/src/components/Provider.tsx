import React from 'react'
import { createContext } from 'react-hooks-in-callback'
import { useReducer } from 'react'
import { ActionType } from '../store/reducers'
export type Item = { id: string }
export type State = {
  title: string
  users: Item[]
}
const stateCtx = createContext<State>(undefined as any)
const dispatchCtx = createContext<
  React.Dispatch<{ type: ActionType; payload: any }>
>(undefined as any)

const { useContextSelector: useDispatchSelector } = dispatchCtx
export const useDispatch = () => useDispatchSelector((disp) => disp)
export const { useContextSelector: useStateSelector } = stateCtx

export const Provider: React.FC<{
  reducer: (state: State, action: any) => State
  initialState: State
}> = React.memo((props) => {
  const [state, dispatch] = useReducer<(state: any, action: any) => State>(
    props.reducer,
    props.initialState
  )
  return (
    <dispatchCtx.Provider value={dispatch}>
      <stateCtx.Provider value={state}>{props.children}</stateCtx.Provider>
    </dispatchCtx.Provider>
  )
})
