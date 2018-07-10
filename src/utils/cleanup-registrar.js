const noop = () => {}

export default function cleanUp(callback = noop) {
  function exitHandler(options, err) {
    callback.call(null, {})

    if (options.cleanup) console.log('cleaned')
    if (err) console.log(err.stack)
    if (options.exit) process.exit()
  }

  // do app specific cleaning before exiting
  process.on('exit', exitHandler.bind(null, {
    cleanup: true
  }))

  // catch ctrl+c event and exit normally
  process.on('SIGINT', exitHandler.bind(null, {
    exit: true
  }))

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, {
    exit: true
  }))
  process.on('SIGUSR2', exitHandler.bind(null, {
    exit: true
  }))

  // catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', exitHandler.bind(null, {
    exit: true
  }))
}
