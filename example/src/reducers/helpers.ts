export const dispatchError = (utils: any, error: any) =>
  console.log(
    'process #' + (utils.getProcessState().index + 1) + ' finished with error:',
    error?.message
  )
export const dispatchSuccess = (utils: any, result: any) =>
  console.log(
    'process #' +
      (utils.getProcessState().index + 1) +
      ' completed successfully with result =>',
    result
  )
