// Empty object stub — for modules whose API surface we don't need at all
// (e.g. node:url, node:os). Expose common names as no-ops so destructuring
// doesn't break the bundler.

export const tmpdir = () => '/tmp'
export const homedir = () => '/home'
export const platform = () => 'browser'
export const hostname = () => 'browser'
export const cpus = () => []
export const totalmem = () => 0
export const freemem = () => 0
export const networkInterfaces = () => []
export const type = () => 'Browser'
export const release = () => '0'
export const EOL = '\n'
export const parse = () => ({})
export const format = () => ''
export const resolve = () => '/'
export const fileURLToPath = () => '/'
export const pathToFileURL = () => ({ href: 'file:///' })

export default {}
