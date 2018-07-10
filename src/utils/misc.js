export const waitFor = (timeout) => {
  return new Promise(fulfill => setTimeout(fulfill, timeout))
}
