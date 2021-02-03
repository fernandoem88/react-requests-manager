import { Reducer } from 'redux'

export type Item = { id: string }
export type State = {
  title: string
  users: Item[]
}
export enum ActionType {
  ADD_USER,
  DELETE_USER,
  SET_USER_LIST
}

export const reducer: Reducer<any, any> = (
  state: State,
  action: { type: ActionType; payload: any }
) => {
  switch (action.type) {
    case ActionType.ADD_USER:
      return { ...state, users: [...state.users, action.payload] }
    case ActionType.DELETE_USER:
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload)
      }
    case ActionType.SET_USER_LIST:
      return { ...state, users: action.payload }
    default:
      return state
  }
}
