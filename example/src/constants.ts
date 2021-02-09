export const labels = {
  login: {
    title: 'login (ignore new processes)',
    descr:
      'when there is already a running process, all new processes will be ignored '
  },
  pagination: {
    title: 'pagination (abort previous)',
    descr: 'a new process will abort all previous ones'
  },
  fetchUser: {
    title: 'fetch user (commit only one)',
    descr:
      'there are many processes running at the same time, the first to commit will abort the remaining ones'
  },
  postComment: {
    title: 'post comment (multi commits)',
    descr: 'all processes will run in parallel and will eventually commit'
  },
  fetchImage: {
    title: 'fetch Image (queue)',
    descr:
      'processes are suspended in a queue, and only one can be run at the time'
  }
}

export const requestsNames = [
  'fetchUser',
  'postComment',
  'fetchImage',
  'login',
  'pagination'
]
