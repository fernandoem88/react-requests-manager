# react-requests-manager

> this package will help you to

- have a full control on your async actions
- separate async actions' state to your application data state

[![NPM](https://img.shields.io/npm/v/react-requests-manager.svg)](https://www.npmjs.com/package/react-requests-manager) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-requests-manager
```

## Request vs Process

Since we will talk a lot about _requests_ and _processes_, let's then clarify the concept for an easy comprehension.

- a **request** is an action where async tasks will be defined
- a **process** is just an instance of a given request (we can have many processes of the same request running at the same time in our application)

for example if we define a _fetchUsers_ request, every time we will call it in our project, the manager will create a new process of the request. Each process state will have an impact to the final request state.

# Common way vs Requests-manager way

Currently, the common way to manage your async actions is to define a _redux-thunk_ action and dispatch each of its state to _redux_.

this implies 3 points

- for each action, we should add 2 states to the redux store (_processing_ and _error_) and have at least 3 cases in our reducer (eg: _start_, _success_ and _failure_ ).
- a lil bit tricky to abort our requests processes
- we have only one processing type, that's is a linear one: start processing and finish with success or error. if we want for example to process requests in a queue, we should implement it by ourselves or using another library

let's see a simple example of a redux-thunk action

```ts
// defining fetchUsers async action to fetch users from db
const fetchUsers = (dispatch: Dispatch) => async (userIds: string[]) => {
  ...
  dispatch({ type: "FETCH_USERS_START" })
  ...
  try {
    const users = await api.getUsers(userIds).send()
    dispatch({ type: "FETCH_USERS_SUCCESS", payload: users })
  } catch (error) {
    dispatch({ type: "FETCH_USERS_FAILURE", payload: error })
  }
}
```

and its respective implementation in the reducer side

```ts
// application state
const initialState = {
  users: [],
  isFetchingUsers: false,
  fetchUsersError: null
}

// reducer definition
const usersReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case 'FETCH_USERS_START':
      return { ...state, isFetchingUsers: true, fetchUsersError: null }

    case 'FETCH_USERS_SUCCESS':
      return {
        ...state,
        fetchUsersError: null,
        isFetchingUsers: false,
        users: payload.users
      }

    case 'FETCH_USERS_FAILURE':
      return {
        ...state,
        fetchUsersError: payload.error,
        isFetchingUsers: false
      }

    default:
      return state
  }
}
```

instead, using the _requests-manager_ approach will

- keep our redux-state clean because all requests (_async actions_) states are managed by the library
- let us have a full control of all processes for every async actions
- give us a simple way to change request/processing type using **request type wrappers**: Queue, Multi and Single

let's see a simple illustration

```ts


// defining fetchUsers async action to fetch users from db
const fetchUsers = async (utils: RequestUtils<string[]>, userIds: string[]) => {
  ...
  // dispatch({ type: "FETCH_USERS_START" })
  utils.start()
  ...
  try {
    const users = await api.getUsers(userIds).send()
    // dispatch({ type: "FETCH_USERS_SUCCESS", payload: users })
    utils.finish({ status: "success" }, () => {
      dispatch({ type: "SET_USERS", payload: users })
    })
  } catch (error) {
    // dispatch({ type: "FETCH_USERS_FAILURE", payload: error })
    utils.finish({ status: "error", error }) // we dont dispatch error to the reducer
  }
}
```

even if the action implementation in this approach is quiet similar to the redux-thunk one. there are some benefits this approach will bring as we will see further!

let's now see what changes in the reducer side!

```ts
// application state
const initialState = {
  users: [] // only the main data in our application state
}

// reducer definition
const usersReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    // we just have to handle the case of setting the data because
    // the processing state and the error state are handled by the requests manager
    case 'SET_USERS':
      return { ...state, users: payload.users }
    default:
      return state
  }
}
```

Here, we can clearly see how the reducer side is clean, and this will be the case for every async action we will define in our application.

The access to the requests state is kept simple and easy using the _useRequests_ hook that accepts a _selector function_ to pick a determined state from the _requests record (reqs)_.
Each _key_ from _reqs_ is an object with the following signature { _isProcessing: boolean_, _error: any_, _details: RequestDetails_ } that reflect the respective request state.

let's see and compare both approaches.

```ts
// access requests and application state in the standard and common way
const MyComponent = () => {
  // data
  const users = useSelector(state => state.users)
  // requests
  const isFetchingUsers = useSelector(state => state.isFetchingUsers)
  const fetchUsersError = useSelector(state => state.fetchUsersError)
  ...
}

// access requests and application state using requests-manager approach
const MyComponent = () => {
  // data
  const users = useSelector(state => state.users)
  // requests
  const isFetchingUsers = useRequests(reqs => reqs.fetchUsers.isProcessing)
  const fetchUsersError = useRequests(reqs => reqs.fetchUsers.error)
  ...
}
```

We saw the benefit in the _reducer state_ side, but another one is that aborting a process is made easy in this library using extra actions over the request, and we will see it later.

let's just see how we should change _fetchUsers_ action to tell the manager how to abort concretly the request: passing the _abort function_ to _utils.onAbort_ callback.

```ts

// defining fetchUsers async action to fetch users from db
const fetchUsers = async (utils: RequestUtils<any>, userIds: string[]) => {
  ...
  utils.start()
  const req = api.getUsers(userIds)
  utils.onAbort(() => {
    // here is where we will abort concretely the request sent to the server
    req.abort()
  })
  ...
  try {
    const users = await req.send() // here we send the request to the server
    ...
  } catch (error) {
    ...
  }
}
```

Last benefit is the _request type_ wrappers that allows you to have different approach on your async action depending on your needs and requirements.

# Request type wrappers

- **Single**: (default behaviour) only one process can finish (_success_ or _error_), and the remaining ones will automatically _abort_

- **Multi**: all the started processes will eventually finish (success or error) if no one aborts or cancels them.

- **Queue**: a new process will be suspended untill the previous one will finish/abort/cancel

## Usage

we should pass an async callback to the **request type wrapper** where we will define our request logic.

for example if we want to define a fetchData

```ts
import { Single } from 'react-requests-manager'

const fetchData = Single(async (utils, params: Params) => {
  // utils is of type RequestUtils<Params>
  // request logic
})
```

- **utils**: first parameter of the **request callback** and a provided utilities object that will let you manage your request state.
- **params**: (optional) the parameter you will probably pass to the final request when you will use it in your components.

Let's see now how we will effectively use the **react-requests-manager** library, step by step, in our projects.

First of all, since the first idea of the library is to separate the application state and the requests state, we can structure our project like follows, by creating an **async** folder at the same level as the _reducers_ folder, where we will add 3 files

- **requests.ts** to define our requests
- **actions.ts** (optional) to define extra actions that act over the defined requests
- **index.ts** to finally define the requests-manager context that we will use in our components

```
store |
       -- users |
                -- reducers // all users reducers go in this folders
                -- async |
                           -- requests.ts
                           -- actions.ts
                           -- index.ts
```

let's focus now on the _requests.ts_ file and how to use different wrapper types

## Single type

the "Single" type is the default one. so it's not mandatory to wrap the async action by it but it's still a good practice to do so in order to keep all requests' definition uniform. so we can wrap the _fetchUsers_ request without alterating its behaviour!

```ts
import { Single } from 'react-requests-manager'

// Single: once a process calls utils.finish, others will abort
export const fetchUsers = Single(async (utils, userIds: string[]) => {
  // in this example, utils will be of type RequestUtils<string>
  utils.start(function onStart() {
    // on success logic: optional
  })
  // you should replace this with a working example
  const req = API.getUsers(userIds)
  utils.onAbort(function abort() {
    // how will you abort your request if some one triggers an abort action
    req.abort()
  })
  try {
    const users = await req.send()
    utils.finish('success', function onSuccess() {
      // on success logic: optional
      dispath({ type: 'ADD_USERS', payload: users })
    })
  } catch (error) {
    utils.finish({ status: 'error', error }, function onError() {
      // on error logic: optional
    })
  }
})
```

## Queue type

we can add another request that we will call _fetchImage_ and for a performance reason, we will want to handle each process one by one. so evry process will stay in a queue untill the previous one will finish or abort.

```ts
import { Queue } from 'react-requests-manager'

// Queue: a process is suspended until the previous will finish
// all processes will eventually reach "utils.finish" (success or error) if no one abort/cancel them
export const fetchImage = Queue(async (utils, image: Image) => {
  // in this example, utils will be of type RequestUtilsQueue<Image>
  await utils.inQueue(function onStart(){
    // on start logic: optional
  })
  // you should replace this with a working example
  const req = API.fetchImage(image.id)
  utils.onAbort(function abort(){
    // abort logic
    req.abort()
  })
  try {
    await req.send()
    utils.finish("success")
  } catch () {
    utils.finish("error")
  }
})
```

## Multi type

lastly we can add a case, where we want to handle every process in a parallel way where every process will eventually reach the _utils.finish_ step. let's see an example with a _deleteComment_ request definition in the _requests.ts_ file

```ts
import { Multi } from 'react-requests-manager'

// Multi: all processes will eventually reach "utils.finish" (success or error) if no one abort/cancel them
export const deleteComment = Multi(async (utils, comment: { id: string }) => {
  // in this example, utils will be of type RequestUtils<{ id: string }>
  // the request body is the same as in the case of Single Request Type
  utils.start()
  ...
  utils.onAbort(() => {
    // abort logic
  })
  ...
  try {
    ...
    utils.finsh("success")
  } catch () {
    utils.finish("error")
  }
})
```

_(we can use [react-hooks-in-callback](https://www.npmjs.com/package/react-hooks-in-callback) library to use dipatch, store, history, etc... directly in our request callback body)_

if we want to define some extra actions like _abort_, _reset_, _clear errors_ over our requests, we can put them in the **actions.ts** file.

```ts
import { ActionUtils } from 'react-requests-manager'
import * as REQS from './requests'
// REQS = { fetchUsers, fetchImage, deleteComment }

type AU = ActionsUtils<typeof REQS>

// here we can define extra actions to abort, reset request or clear errors from some requests

// aborting all requests
export const abortAll = (utils: AU) => {
  utils.abort()
}

// abort all processes of a given request
export const abort = (utils: AU, requestName: keyof typeof REQS) => {
  const reqState = utils.getRequestState(params.requestName)
  if (!reqState?.isProcessing) return
  // here we are sure that the request exists and it is processing
  utils.abort(requestName)
}

// abort a specific process of a given request
export const abortProcessById = (
  utils: AU,
  params: { processId: string; requestName: keyof typeof REQS }
) => {
  const reqState = utils.getRequestState(params.requestName)
  if (!reqState?.isProcessing) return
  if (!reqState.details.processes[params.processId]) return
  // here we are sure that the request exists and it has the given process
  utils.abort(params.requestName, (process) => process.id === params.id)
}

// reset a request state
export const reset = (utils: AU, requestName: keyof typeof REQS) => {
  utils.resetRequest(requestName)
}
```

after defining requests and actions logic, we should bind them to the manager using **createRequests** and **createManager**.

let's then implement it in the **index.ts** file as follows

```ts
import { createRequests, createManager } from 'react-requests-manager'
import * as REQS from './requests'
import * as EXTRA_ACTIONS from './actions'
// REQS = { fetchUsers, fetchImage, deleteComment }

// usersRC: user requests configurator: helper that allows us to bind the requests to the requests manager
export const usersRC = createRequests(REQS, EXTRA_ACTIONS) // EXTRA_ACTIONS is optional

// $users: is the "users requests manager's context" and contains all requests related helpfull utilities.
// $users = { requests, extraActions, useRequests, getState, bindToStateManager }
export const $users = createManager('USER', usersRC)
```

## usage in the component

now we can use the requests manager (**$user**) in the component as follows!

```ts
import React from 'react'
import { $users } from '../store/async/users'

const Users: React.FC<{ userIds: string[] }> = (props) => {
  ...
  // we can use a selector to get a request state or to return another value depending on the context state.
  // in this case we will just take the fetchUser request state
  const fetchUsersState = $users.useRequests((reqs: Requests) => reqs.fetchUsers)
  // fetchUsersState = { isProcessing, error: any, details: Details }
  // details = { processes: Dictionary<ProcessState>, count }
  // count = Record<processing | suspended | cancelled | aborted  | success | error | total, number>
  ...
  const handleFetch = () => {
    // this will call the fetchUser request defined in the requests.ts file
    // with userId as parameter and will turn the fetchUsersState.isProcessing to true
    // if the processId is undefined, it means that the process was cancelled just after being created, otherwise you can use it to check the process state
    const processId = $users.requests.fetchUsers(props.userIds)
  }
  const handleAbort = () => {
    // if the fetchUsersState was processing, calling this will abort it and turn its isProcessing state to false.
    // to check the status of this process, you can use the processId and check its status in the fetchUsersState.processes dictionary
    $users.extraActions.abort('fetchUsers')
  }
  ...
  if (fetchUsersState.isProcessing) {
    return <div>Fetching users</div>
  }
  if (!!fetchUsersState.error) {
    // error is the value passed in utils.finsh
    // for example: const errorMsg = "404 not found"
    // utils.finish({ status: "success/error", error: errorMsg })
    // fetchUsersState.error will be 404 not found
    return <div>has fetching error: {fetchUsersState.error}</div>
  }

  return (
    <div>
      ...
      <buton onClick={handleFetch}>start fetching</buton>
      <buton onClick={handleAbort}> abort fetch user </buton>
    </div>
  )
}
```

you can see a working example [here](https://codesandbox.io/s/requests-manager-1-9gv5h)

# Combined requests manager contexts

like we do with **reducers**, it can be necessary to split requests logic by entities, for example _users requests_, _media requests_, etc; and combine them at the end to have a manager with combined states.

in this case we should use **createGroupManager**

let's imagine to have this structure

```txt
store|
      -- index.ts
      -- users |
                -- reducers //
                -- async |
                          -- requests.ts
                          -- actions.ts
                          -- index.ts
      -- media |
                -- reducers //
                -- async |
                          -- requests.ts
                          -- actions.ts
                          -- index.ts

```

we can move the _fetchImage_ request to the _media/requests.ts_ file and define also extra actions in the _actions.ts_ file.

last point, we should define and export the media request configurator from media/index.ts file

```ts
import { createRequests } from 'react-requests-manager'
import * as REQS from './requests'
import * as EXTRA_ACTIONS from './actions'
// REQS = {  fetchImage }

// mediaRC: media requests configurator
export const mediaRC = createRequests(REQS, EXTRA_ACTIONS) // EXTRA_ACTIONS is optional
```

then we can combine the _usersRC_ and the _mediaRC_ like follows

```ts
import { createGroupManager } from 'react-requests-manager'

import { usersRC } from './users/async'
import { mediaRC } from './media/async'

// $$: is the "requests manager's group" and contains all related helpfull utilities.

export const $$ = createGroupManager({ users: usersRC, media: mediaRC })
// $$ signature is the same as before: { requests, extraActions, useRequests, getState, bindToStateManager } with only one difference that requests and extraActions are records which keys are requests and actions names respectively which objects are requests and extra actions respectively.
```

the usage of the **$$** group manager is still the same with just a new level to access the requests and the extra actions

```ts
import React from 'react'
import { $$ } from '../store/async'

const Users: React.FC<{ userIds: string[] }> = (props) => {
  ...
  const fetchUsersState = $$.useRequests((reqs: Requests) => reqs.user.fetchUsers)
  const handleFetch = () => {
    const processId = $$.requests.users.fetchUsers(props.userIds)
  }
  const handleAbort = () => {
    $user.extraActions.users.abort('fetchUsers')
  }
  ...
  if (fetchUsersState.isProcessing) {
    return <div>Fetching users</div>
  }
  if (!!fetchUsersState.error) {
    return <div>has fetching error: {fetchUsersState.error}</div>
  }

  return (
    <div>
      ...
      <buton onClick={handleFetch}>start fetching</buton>
      <buton onClick={handleAbort}> abort fetch user </buton>
    </div>
  )
}
```

# Common request utils

## utils.start

if you are familiar with redux-thunk, you probably know that before sending a request to the server, you should dispatch a requestStart to the redux store, so utils.start works at the same way.

```ts
utils.start();
// your process state will turn to process.status = "processing"
...
// if you have update to do on start, you can pass a callback
utils.start(function onStart(){
  // dispatch to redux
  // utils.clearError(  )
})
```

## utils.inQueue (only for Queue type wrapper)

```ts
await utils.inQueue(function onStart() {
  // on start logic
})
```

## utils.finish

when you have the server response you will probably need to dispatch it your application state manager (redux for example), this is the place to do so.

```ts
type StatusData =
  | ProcessStatus
  | {
      status: ProcessStatus
      error?: any
      metadata: Dictionary<any>
    }
utils.finish(FinishData)

const status: StatusData = 'success'
// questo equivale a
utils.finish(status, () => {
  // this callback is optional
  // dispatch to your application state manager
})

// the error value will be passed to the request Error value
// while the status will be only for the process.
utils.finish({
  status: 'error',
  error: {
    pippo: '404 not found',
    pluto: '500 server error'
  }
})
```

## utils.cancel

after some verifications, if the process is not eligible to stay alive, you can cancel it inside the request body using exclusively the utils.cancel helper.
a special case, if you did not call utils.start yet, you can return false to cancel the process

## utils.onAbort

## utils.abortPrevious

## utils.getProcessState vs utils.getRequestState

# abort

by default all started or suspended process are kept in state when aborted
you can still change it when you call abort or abortPrevious

# selectors

# Bind to state manager

in the case you want to have a selector hook where you can have access both to your application data state and the requests state, it's possible by using _bindToStateManager_

```ts
import reducers, { initialState } from './store/reducers'
import { $users } from './store/async/users'
import { $$ } from './store/async'

interface StateManagerStore<State> {
  getState(): State
  subscribe(): Function | { unsubscribe: Function }
}
const store = createStore(reducers, initialState) as StateManagerStore<AppState>
export const { useSelector: useStoreAndReqs } = $users.bindToStateManager(store)

export const { useSelector: useStoreAndReqs2 } = $$.bindToStateManager(store)

// useStoreAndReqs: (selector: (state: AppState, reqs: Requests) => R) => R
```

## License

MIT © [fernando ekutsu mondele](https://github.com/fernandoem88/react-requests-manager)

```

```
