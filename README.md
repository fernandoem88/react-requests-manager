# react-requests-manager

> this package will help you to

- have a full control on your async actions
- separate async actions' state to your application data state

[![NPM](https://img.shields.io/npm/v/react-requests-manager.svg)](https://www.npmjs.com/package/react-requests-manager) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-requests-manager
```

# Common way vs Request manager way

Currently, the common way to manage your async actions is to define a _redux-thunk_ action and dispatch each of its state to _redux_.

this implies 3 points

- for each action, we should add 2 states to the redux store (_processing_ and _error_) and have at least 3 cases in our reducer (eg: _start_, _success_ and _failure_ ).
- a lil bit tricky to abort our requests processes
- we have only one processing type, that's is a linear one: start processing and finish with success or error. if we want for example to process requests in a queue, we should implement it by ourselves or using another library

let's see a simple example

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

// in the reducer side

// application state
const initialState = {
  users: [],
  isFetchingUsers: false,
  usersError: null
}

// reducer definition
const usersReducer = (state = initialState, { type, payload }) => {
  switch (type) {

    case "FETCH_USERS_START":
      return { ...state, isFetchingUsers: true, usersError: null };

    case "FETCH_USERS_SUCCESS":
      return { ...state, usersError: null, isFetchingUsers: false, users: payload.users };

    case "FETCH_USERS_FAILURE":
      return { ...state, usersError: payload.error, isFetchingUsers: false };

    default: return state
  }
}
```

using the _requests-manager_ approach will

- keep your redux-state clean and because all states are managed by the library
- let you have a total control of all processes for all requests
- change processing types in a simple way using **requests wrapper**: Queue, Multi and Single

```ts
import { Single, Queue, Multi } from "react-requests-manager"

// defining fetchUsers async action to fetch users from db
const fetchUsers = Single(async (utils: RequestUtils<any>, userIds: string[]) => {
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
    utils.finish({ status: "error", error })
  }
})

// in the reducer side

// application state
const initialState = {
  users: [],
}

// reducer definition
const usersReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case "SET_USERS":
      return { ...state, users: payload.users };
    default: return state
  }
}
```

# Request types: (**Single**, **Multi**, **Queue**)

- **Single**: only one process can finish (success or error), and the remaining ones will automatically abort

- **Multi**: all the started processes will eventually finish (success or error) if no one aborts or cancels them.

- **Queue**: a new process will be suspended untill the previous one will finish/abort/cancel

## Usage

we should pass an async callback to the **request type wrapper**.

for example if we define a fetchData

```ts
import { Single } from 'react-requests-manager'

const fetchData = Single<Params>(
  async (utils: RequestUtils<Params>, params: Params) => {
    // request logic
  }
)
```

- **utils**: first parameter of the **request callback** and a provided utilities object that will let you manage your request state.
- **params**: (optional) the parameter you will probably pass to the final request when you will use it in your components.

## Request vs Process

- a request is an action where tasks will be defined
- a process is just an istance of a given request (we can have many processes of the same request running at the same time)

for example if you define a _fetchUser_ request, every time you will call it in your application, the manager will create a new process of the request. each process state will have an impact to the final request state. the _request utils_ object has access to the store and will help to define properly the process state and at the same time, also the request state.

we can see a more detailed example, creating a **requests-manager/requests.ts** file where we'll define some requests as follows

```ts
import { Single, Multi, Queue } from 'react-requests-manager'

// Single: once a process calls utils.finish, others will abort
export const fetchUser = Single(async (utils, userId: string) => {
  // in this example, utils will be of type RequestUtils<string>
  utils.start(function onStart() {
    // on success logic: optional
  })
  // you should replace this with a working example
  const xhqr = API.getUser(userId)
  utils.onAbort(function abort() {
    // how will you abort your request if some one triggers an abort action
    xhqr.abort()
  })
  try {
    const result = await xhqr.send()
    utils.finish('success', function onSuccess() {
      // on success logic: optional
      dispath({ type: 'add_user', payload: result })
    })
  } catch (error) {
    utils.finish({ status: 'error', error }, function onError() {
      // on error logic: optional
    })
  }
})

// Queue: a process is suspended untill the previous will finish
// all processes will eventually reach "utils.finish" (success or error) if no one abort/cancel them
export const fetchImage = Queue(async (utils, image: Image) => {
  // in this example, utils will be of type RequestUtilsQueue<Image>
  await utils.inQueue(function onStart(){
    // on start logic: optional
  })
  // you should replace this with a working example
  const xhqr = API.fetchImage(image)
  utils.onAbort(function abort(){
    // abort logic
    xhqr.abort()
  })
  try {
    await xhqr.send()
    utils.finish("success")
  } catch () {
    utils.finish("error")
  }
})

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

(_you can use [react-hooks-in-callback](https://www.npmjs.com/package/react-hooks-in-callback) library to use dipatch, store, history, etc... directly in your request callback body._)

after defining requests logic, we should bind them to the manager using **createRequests** and **createManager** imported from _react-requests-manager_.

let's then implement it in the **requests-manager/index.ts** file as follows

```ts
import { createRequests, createManager } from 'react-requests-manager'
import * as REQS from './requests'
// REQS = { fetchUser, fetchImage, deleteComment }

// userRC: user requests configurator: helper that allows us to bind the requests to the requests manager
export const userRC = createRequests(REQS, {
  // here you can define extra actions over the requests: abort, reset, clear errors...
  abort(utils, requestName: keyof typeof request) {
    utils.abort(requestName)
  },
  abortAll(utils) {
    utils.abort()
  },
  reset(utils, requestName: keyof typeof request) {
    utils.resetRequest(requestName)
  }
})

export const $user = createManager('USER', userRC)

// $user: is the "user requests manager's context" and contains all requests related helpfull utilities.
// $user = { requests, extraActions, useRequests, getState, bindToStateManager }
```

## usage in the component

now we can use the requests manager (**$user**) in the component as follows!

```ts
import React from 'react'
import { $user } from '../requests-manager'

const MyComponent: React.FC<{ userId: string }> = (props) => {
  ...
  // we can use a selector to get a request state or to return another value depending on the context state.
  // in this case we will just take the fetchUser request state
  const fetchUserState = $user.useRequests((reqs: Requests) => reqs.fetchUser)
  // fetchUserState = { isProcessing, error: any, details: Details }
  // details = { processes: Dictionary<ProcessState>, count }
  // count = Record<processing | suspended | cancelled | aborted  | success | error | total, number>
  ...
  const label = fetchUserState.isProcessing ? 'fetching user...' : ''
  ...
  const handleFetch = () => {
    // this will call the fetchUser request defined in the requests.ts file
    // with userId as parameter and will turn the fetchUserState.isProcessing to true
    // if the processId is undefined, it means that the process was cancelled just after being created, otherwise you can use it to check the process state
    const processId = $user.request.fetchUser(props.userId)
  }
  const handleAbort = () => {
    // if the fetchUserState was processing, calling this will abort it and turn its isProcessing state to false.
    // to check the status of this process, you can use the processId and check its status in the fetchUserState.processes dictionary
    $user.extraActions.abort('fetchUser')
  }
  ...
  if (!!fetchUserState.error) {
    // error is the value passed in utils.finsh
    // for example: const errorMsg = "404 not found"
    // utils.finish({ status: "success/error", error: errorMsg })
    // fetchUserState.error will be 404 not found
    return <div>has fetching error: {fetchUserState.error}</div>
  }

  return (
    <div>
      {!!label && <h1>{label}</h1>}
      ...
      <buton onClick={handleFetch}>start fetching</buton>
      <buton onClick={handleAbort}> abort fetch user </buton>
    </div>
  )
}
```

you can see a working example [here](https://codesandbox.io/s/requests-manager-1-9gv5h)

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

## License

MIT © [fernando ekutsu mondele](https://github.com/fernandoem88/react-requests-manager)
