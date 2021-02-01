import * as requests from './requests'
// import * as actions from './actions'
import { createRequests, createManager } from 'react-requests-manager'

const { configurator, utils } = createRequests(requests)

export const requestUtils = utils

export const {
  manager: $$,
  useRequests,
  getState: getRequests
} = createManager('TEST', configurator)
