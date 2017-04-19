
import mysql from 'mysql'

class Database {
  constructor(opts) {
    this.opts = opts
  }
  connect(opts) {
    if (opts) {
      this.opts = opts
    }
    this.connection = mysql.createConnection(this.opts)
    return new Promise((resolve, reject) => {
      this.connection.connect(function(err) {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }
  close() {
    if (this.connection) {
      this.connection.end()
      this.connection = null
    }
  }
  query(sql, params) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, params, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
    })
  }
  queryOne(sql, params) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, params, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results[0])
      })
    })
  }
}

export function ii(s, len = 2, pad = '0') {
  s = s.toString()
  while (s.length < len) {
    s = pad + s
  }
  return s
}

export { Database }
