# react-requests-manager

> this package will help you to

- have a full control on your async actions
- separate async actions' state to your application data state

[![NPM](https://img.shields.io/npm/v/react-requests-manager.svg)](https://www.npmjs.com/package/react-requests-manager)

## Install

```bash
npm install --save react-requests-manager
```

## Request vs Process

Since we will talk a lot about _requests_ and _processes_, let's then clarify the concept for an easy understanding.

- a **request** is an action where async tasks will be defined (like getting data from the server)
- a **process** is just an instance of a given request (we can have many _processes_ of the same _request_ running at the same time in our application)

For example if we define a _fetchUsers_ request, every time we will call it in our project, the manager will create a new process, and each process state will have an impact to the final request state.

# Common approach vs Requests-manager approach

## common approach

Currently, the common way to manage our async actions is to define a _redux-thunk_ action and dispatch each of its state to the _redux_ store.

This implies 3 points:

- for each action, we should add the _processing_ and the _error_ states to the redux store and handle at least 3 cases in our reducer (_request-start_, _request-success_ and _request-failure_).
- it will be a lil bit tricky to abort our requests processes
- we have only one processing type, that is the linear one: start processing and finish with success or error. If we want for example to have a queue processing type, we should implement it by ourselves or use another library.

let's see a simple example of a redux-thunk action

```ts
// fetchUsers async action to fetch users from db using redux-thunk
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

## requests-manager approach

Instead, if we decide to use the _requests-manager_ approach, it will help us to:

- keep our redux-state clean because all _requests_ states are managed by the library
- have a full control of all _processes_ for every _request_
- change easily the _request_ processing type using **request type wrappers** (_Queue_, _Multi_ and _Single_)

let's see a simple illustration

```ts
// fetchUsers async action to fetch users from db
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

Even if the action implementation in this approach is quiet similar to the _redux-thunk_ one, there are some benefits this approach will bring as we will see later!

let's now focus on what changes in the reducer side!

```ts
// application state
const initialState = {
  users: [] // we keep only the main data in our application state
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

Here, we can clearly see how the reducer side is clean, and this will be the same for every **Request** we will define in our application.

The access to the _requests_ state is kept simple and easy using the **useRequests** hook that accepts a _selector function_ to pick a determined state from the _requests record_ (**reqs**).

let's see and compare both approaches.

```ts
// access requests and application state in the standard and common way
import { useSelector } from "react-redux"

const MyComponent = () => {
  // data
  const users = useSelector(state => state.users)
  // requests
  const isFetchingUsers = useSelector(state => state.isFetchingUsers)
  const fetchUsersError = useSelector(state => state.fetchUsersError)
  ...
}


// access requests and application state using requests-manager approach
import { useSelector } from "react-redux"

// $users is the users requests manager and we'll see later how to define it!
const { useRequests } = $users

const MyComponent = () => {
  // data
  const users = useSelector(state => state.users)
  // requests
  const isFetchingUsers = useRequests(reqs => reqs.fetchUsers.isProcessing)
  const fetchUsersError = useRequests(reqs => reqs.fetchUsers.error)
  ...
}
```

We saw the benefit in the _reducer state_ side, but another one is that aborting a process is made easy in this library using extra actions over the request.

we will see later how to define extra actions to _abort_, _reset_ and _clear errors_ over the request state. For now, let's just see how we should change _fetchUsers request_ to tell the manager how to abort it concretly (we will pass the _abort function_ to _utils.onAbort_ callback)

```ts

// fetchUsers async action
const fetchUsers = async (utils: RequestUtils<any>, userIds: string[]) => {
  ...
  utils.start()
  const req = api.getUsers(userIds)
  utils.onAbort(() => {
    // here we can dispatch some data to the reducers if needed!
    req.abort() // => this is where we will abort effectively the server request
  })
  ...
  try {
    // here we send the request to the server
    // req.abort() will probably trigger a reject from the req.send returned promise
    const users = await req.send()
    ...
  } catch (error) {
    ...
  }
}
```

Last benefit of this approach is the _request type_ wrappers that allows us to have different approaches on our _requests_ depending on our needs and requirements.

# Request type wrappers

- **Single**: (default behaviour) only one process can finish (_success_ or _error_), and the remaining ones will automatically _abort_

- **Multi**: all the started processes will eventually finish (success or error) if no one aborts or cancels them.

- **Queue**: a new process will be suspended untill the previous one will finish/abort/cancel

## Usage

we should pass the async callback to the **request type wrapper** where we will define our _request_ logic.

For example if we want to define a fetchData

```ts
import { Single } from 'react-requests-manager'

const fetchData = Single(async (utils, params: Params) => {
  // utils is of type RequestUtils<Params>
  // request logic goes here
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

### Single type

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

### Queue type

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

### Multi type

Lastly we can add a case, where we want to handle every process in a parallel way where each of them will eventually reach the _utils.finish_ step.

Let's see an example with a _deleteComment_ request implementation in the _requests.ts_ file

```ts
import { Multi } from 'react-requests-manager'

// Multi: all processes will eventually reach "utils.finish" (success or error) if no one abort/cancel them
export const deleteComment = Multi(async (utils, comment: { id: string }) => {
  // in this example, utils will be of type RequestUtils<{ id: string }>
  // the request body is the same as in the case of Single Request Type
  utils.start(function onStart(){
    // optional:
    // dispatch, history.push, ....
  })
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

> _(we can use [react-hooks-in-callback](https://www.npmjs.com/package/react-hooks-in-callback) library to use dipatch, store, history, etc... directly in our request callback body)_

if we want to have some extra actions like _abort_, _reset_, _clear errors_ over our _requests processes_, we can define them in the **actions.ts** file.

```ts
import { ActionUtils } from 'react-requests-manager'
import * as REQS from './requests'
// REQS = { fetchUsers, fetchImage, deleteComment }

type AU = ActionsUtils<typeof REQS>

// here we can define extra actions to abort, reset request or clear errors

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

// abort all processes of a fetchUsers request
export const abortFetchUsers = (utils: AU) => {
  const reqState = utils.getRequestState('fetchUsers')
  if (!reqState?.isProcessing) return
  // here we are sure that the request exists and it is processing
  utils.abort('fetchUsers')
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

After defining _requests_ and _extra actions_ logic, we should bind them to the manager using **createRequests** and **createManager**.

let's then implement it in the **index.ts** file as follows

```ts
import { createRequests, createManager } from 'react-requests-manager'
import * as REQS from './requests'
import * as EXTRA_ACTIONS from './actions'
// REQS = { fetchUsers, fetchImage, deleteComment }

// usersRC: user requests configurator: helper that allows us to bind the requests to the requests manager
export const usersRC = createRequests(REQS, EXTRA_ACTIONS) // EXTRA_ACTIONS is optional

// $users: is the "users requests manager's context" and contains all helpfull utilities related to the requests context.
// $users = { requests, extraActions, useRequests, getState, bindToStateManager }
export const $users = createManager('USER', usersRC)
```

### usage in the component

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

like we do with **reducers**, it can be necessary to split requests logic by entities. For example we can have _users requests_ in one side and _media requests_ in another, etc; and combine them at the end to have a manager with combined states.

in this case we should use **createGroupManager**

let's imagine to have this following structure

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

we can move the _fetchImage request_ to the _media/requests.ts_ file and define also _extra actions_ in the _actions.ts_ file.

last point, we should define and export the _media request configurator_ (**_mediaRC_**) from _media/index.ts_ file

```ts
import { createRequests } from 'react-requests-manager'
import * as REQS from './requests'
import * as EXTRA_ACTIONS from './actions'
// REQS = {  fetchImage }

// mediaRC: media requests configurator
export const mediaRC = createRequests(REQS, EXTRA_ACTIONS) // EXTRA_ACTIONS is optional
```

then we can combine both the _usersRC_ and the _mediaRC_ like follows

```ts
import { createGroupManager } from 'react-requests-manager'

import { usersRC } from './users/async'
import { mediaRC } from './media/async'

// $$: is the "requests manager's group" and contains all helpfull utilities related to the combined requests contexts group.
export const $$ = createGroupManager({ users: usersRC, media: mediaRC })
// users: will be the key to access users requests and extra actions
// media: will be the key to access media requests and extra actions....
// the requests manager ($$) signature is still the same as before: { requests, extraActions, useRequests, getState, bindToStateManager } with only one difference that requests and extraActions are records which keys are requests and actions names respectively which values are records of requests and extra actions respectively.
```

the usage of the **$$** group manager is still the same with just a new more level to access the _requests_ and the _extra actions_.

```ts
import React from 'react'
import { $$ } from '../store/async'

const Users: React.FC<{ userIds: string[] }> = (props) => {
  ...
  const fetchUsersState = $$.useRequests((reqs: Requests) => reqs.users.fetchUsers)
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

## utils.finish

when you have the server response you will probably need to dispatch it to your application state manager (redux for example), this is the place to do so.

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
  // we can access the status from the "process state"
  status: 'error',
  // we can access the error from the "request state"
  error: {
    pippo: '404 not found',
    pluto: '500 server error'
  }
})
```

## utils.cancel

if at certain point of the request life cycle, the process does not satisfy some conditions to stay alive,
we can cancel it inside the request body either using the _utils.cancel_ helper or simply by _returning false_.

it's better to _return false_ if the process _did not start yet_ and use _utils.cancel_ otherwise.

```ts
const login = async (utils) => {
  if (utils.getState().isProcessing) {
    return false
  }
  utils.start()
}

const login = async (utils) => {
  utils.start()
  if (utils.getState().isProcessing) {
    utils.cancel()
  }
}
```

By default, a cancelled process is deleted from the request state, to keep it in the state we should use the **keepInStateOnCancel** option!

```ts
const login = async (utils) => {
  utils.start()
  if (utils.getState().isProcessing) {
    utils.cancel({ keepInStateOnCancel: true })
  }
}
```

## utils.onAbort

the onAbort is the place where we abort the request sent to the server and define some final process logic like dispatching to the redux or pushing url to the history.

```ts
utils.onAbort(function abort() {
  // this function should abort the server request
})
```

whenever the abort function will throw an error and we want to catch it by using the onFinish callback from _utils.finish_, we can use the **catchError** option

```ts
utils.onAbort(req.abort, { catchError: true })

try {
  await req.send()
} catch (error) {
  utils.finish('error', function onFinsh() {
    // req.abort make the req.send to reject an error.
    // the error will be caught here
    // on finish callback will be executed
    // the process status will still be aborted! (not error)
  })
}
```

## utils.abortPrevious

allows us to abort previous processes inside the request body!

```ts
const pagination = async (utils, index: number) => {
  // aborting all previous processes
  utils.abortPrevious()
}
```

we can also select which process to abort

```ts
const fetchData = async (utils, priority: 'admin' | 'standard') => {
  if (priority === 'admin') {
    // when trying to fetchData from admin, we will abort all standard users requests
    utils.abortPrevious((process) => process.params === 'standard')
  }
}
```

all aborted processes, are deleted from the request by default. to keep them in the request state we should use the **keepInStateOnAbort** option

```ts
const fetchData = async (utils, priority: 'admin' | 'standard') => {
  if (priority === 'admin') {
    // when trying to fetchData from admin, we will abort all standard users requests
    utils.abortPrevious((process) => process.params === 'standard', {
      keepInStateOnAbort: true
    })
  }
}
```

## utils.getRequestState

Allows us to access the request state from the request body.

```ts
const login = async (utils) => {
  const initialReqState = utils.getRequestState()
  if (initialReqState.isProcessing) {
    // if we are already trying to login, we can already
    return false
  }
  utils.start()
}
```

## utils.getProcessState

an helper to get the current process state

```ts
const test = async (utils) => {
  const initialStatus = utils.getProcessState().status
  utils.start()
  const currentStatus = utils.getProcessState().status
  const shouldBeFalse = initialStatus === currentStatus
}
```

# Queue request utils

the only one difference between other request types and the queue one is the wait they start. the Queue type wrapper utils provide the _inQueue_ helper that returns a _promise_ which allows us to wait for the previous process to finish/abort/cancel to start processing the new one.

## utils.inQueue

```ts
await utils.inQueue(function onStart() {
  // on start logic
  // dispatch some action if nnecessary
  // push history if needed!
})
```

# Action utils

## utils.abort

## utils.resetRequest

## utils.clearErrors

# Bind to state manager

in the case you want to have a **selector hook** where you can have access both to your application data state and the requests state, it's possible by using _bindToStateManager_

```ts
import { createStore } from 'redux'
import reducers, { initialState } from './store/reducers'
import { $users } from './store/async/users'
import { $$ } from './store/async'

interface StateManagerStore<State> {
  getState(): State
  subscribe(listener: Function): Function | { unsubscribe: Function }
}
const store = createStore(reducers, initialState) as StateManagerStore<AppState>
export const { useSelector: useStoreAndReqs } = $users.bindToStateManager(store)

export const { useSelector: useStoreAndReqs2 } = $$.bindToStateManager(store)

// useStoreAndReqs: (selector: (state: AppState, reqs: Requests) => R) => R
```

# selectors

## see also

- [react-hooks-in-callback](https://www.npmjs.com/package/react-hooks-in-callback): a package that will help you to remove undesired rerenders using hooks in callback

- [react-redux-selector-utils](https://www.npmjs.com/package/react-redux-selector-utils): a package that will help you to define and use in a **clean**, **easy** and **fast** way your redux selectors

## License

MIT © [fernando ekutsu mondele](https://github.com/fernandoem88/react-requests-manager)
