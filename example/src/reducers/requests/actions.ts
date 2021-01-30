import * as requests from './requests'
import { ActionUtils } from 'react-requests-manager'

type Requests = typeof requests
type AU = ActionUtils<Requests>
type Action<Params = undefined> = Params extends undefined
  ? (utils: AU) => void
  : (utils: AU, params: Params) => void

export const abortSingle: Action<string> = (utils, id) => {
  utils.abort('singleRequest', (pcss) => pcss.id === id)
}

export const abortMulti: Action<string> = (utils, id) => {
  utils.abort('multiRequest', (pcss) => pcss.id === id)
}

export const abortQueue: Action<string | undefined> = (utils, id) => {
  utils.abort('queueRequest', (pcss) => pcss.id === id)
}
