export const logError = (utils: any, error: any) =>
  console.log(
    'process #' + (utils.getProcessState().index + 1) + ' - error message:',
    error?.message
  )

export const dispatchError = (utils: any) =>
  console.log(
    'process #' + (utils.getProcessState().index + 1) + ' ended with error'
  )
export const dispatchSuccess = (utils: any, result: any) =>
  console.log(
    'process #' +
      (utils.getProcessState().index + 1) +
      ' completed successfully with result =>',
    result
  )
