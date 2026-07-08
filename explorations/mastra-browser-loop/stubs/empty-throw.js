// Catch-all stub for Node-only builtin modules (fs, child_process, http, ...).
// We expose every name @mastra/core imports as a thunk that throws, so any
// accidental invocation surfaces a clear runtime error instead of a build
// failure. This list is not exhaustive — extend it when the bundler complains.

const e = () => {
  throw new Error('Node-only builtin called in browser context (use a browser-friendly alternative)')
}

// fs names
export const readFileSync = e
export const writeFileSync = e
export const existsSync = e
export const readdirSync = e
export const statSync = e
export const lstatSync = e
export const lstat = e
export const mkdirSync = e
export const rmSync = e
export const renameSync = e
export const realpathSync = e
export const realpath = e
export const readlink = e
export const readlinkSync = e
export const access = e
export const accessSync = e
export const readFile = e
export const writeFile = e
export const readdir = e
export const stat = e
export const mkdir = e
export const rm = e
export const rmdir = e
export const unlink = e
export const mkdtemp = e
export const mkdtempSync = e
export const createReadStream = e
export const createWriteStream = e
export const promises = e
export const constants = {}

// child_process names
export const spawn = e
export const spawnSync = e
export const exec = e
export const execSync = e
export const execFile = e
export const execFileSync = e
export const fork = e

// http/https names
export const createServer = e
export const request = e
export const get = e
export const listen = e
export const connect = e

// tls / net names
export { e as tlsConnect }

// module name
export const createRequire = () => {
  throw new Error('createRequire cannot work in browser (no Node require)')
}
export const require = () => {
  throw new Error('require cannot work in browser')
}

// os names used by @mastra/core
export const tmpdir = e
export const homedir = e
export const platform = () => 'browser'
export const hostname = e
export const cpus = () => []
export const totalmem = () => 0
export const freemem = () => 0
export const networkInterfaces = () => []
export const type = () => 'Browser'
export const release = () => '0'
export const EOL = '\n'

export default e
