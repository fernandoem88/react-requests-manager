import { createRequests, createManager } from 'react-requests-manager'
import * as requests from './requests'
import * as extraACtions from './actions'

const configurator = createRequests(requests, extraACtions)
export const $$ = createManager('TEST', configurator)
