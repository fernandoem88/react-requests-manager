import { Reducer } from 'redux'

export type Item = { id: string }
export type State = {
  type: string
  users: Item[]
}
export enum ActionType {
  ADD_USER,
  SET_USER_LIST,
  SET_TYPE
}

export const reducer: Reducer<any, any> = (
  state: State,
  action: { type: ActionType; payload: any }
) => {
  switch (action.type) {
    case ActionType.SET_TYPE: {
      return { ...state, type: action.payload }
    }
    case ActionType.ADD_USER:
      return { ...state, users: [...state.users, action.payload] }
    case ActionType.SET_USER_LIST:
      return { ...state, users: action.payload }
    default:
      return state
  }
}
