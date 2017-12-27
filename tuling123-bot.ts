/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

/**
 * Wechaty bot use a Tuling123.com brain
 *
 * Apply your own tuling123.com API_KEY
 * at: http://www.tuling123.com/html/doc/api.html
 *
 * Enjoy!
 */
/* tslint:disable:no-var-requires */
/* tslint:disable:variable-name */
const r               = require('rethinkdb')
const qrcodeTerminal  = require('qrcode-terminal')
const Tuling123       = require('tuling123-client')

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  config,
  Wechaty,
  log,
}           from '.'

// log.level = 'verbose'
// log.level = 'silly'

/**
 *
 * Apply Your Own Tuling123 Developer API_KEY at:
 * http://www.tuling123.com
 *
 */
const TULING123_API_KEY = '43886559309a4dc8abce3f65edb92c56'
const tuling = new Tuling123(TULING123_API_KEY)

const bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })

var connection = null
r.connect({ host: 'localhost', port: 28015 }, function(err, conn) {
  if(err) throw err
  console.log('connected')
  connection = conn
})


console.log(`
Welcome to Tuling Wechaty Bot.
Tuling API: http://www.tuling123.com/html/doc/api.html

Notice: This bot will only active in the room which name contains 'wechaty'.
/* if (/Wechaty/i.test(room.get('name'))) { */

Loading...
`)

bot
.on('login'  , user => log.info('Bot', `bot login: ${user}`))
.on('logout' , e => log.info('Bot', 'bot logout.'))
.on('scan', (url, code) => {
  if (!/201|200/.test(String(code))) {
    const loginUrl = url.replace(/\/qrcode\//, '/l/')
    qrcodeTerminal.generate(loginUrl)
  }
  console.log(`${url}\n[${code}] Scan QR Code in above url to login: `)
})

.on('message', async msg => {
  // Skip message from self, or inside a room
  if (msg.self() || msg.room()) return

  log.info('Bot', 'talk: %s'  , msg)

  try {
    // const reply = tuling.ask(msg.content(), {userid: msg.from()})
    tuling.ask(msg.content(), {userid: msg.from()}).then(data => {
      log.info('Tuling123', 'Talker reply:"%s" for "%s" ',
        data.text,
        msg.content(),
      )
      r.db('wechaty').table('messages').insert({
        userId: msg.from(),
        message: msg.content(),
        replied: data.text
      }).run(connection, function(err, result) {
        if (err) throw err;
        console.log(JSON.stringify(result, null, 2));
      })

      msg.say(data.text)
    })
  } catch (e) {
    log.error('Bot', 'on message tuling.ask() exception: %s' , e && e.message || e)
  }
})

bot.start()
.catch(e => {
  log.error('Bot', 'init() fail:' + e)
  bot.quit()
  process.exit(-1)
})
