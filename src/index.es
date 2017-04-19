
import fs from 'fs'
import path from 'path'
import he from 'he'
import { Database, ii } from './utils'
import config from '../config'

const SOURCE_DIR = path.join(__dirname, '../../source')
const PREFIX = 'wp_'
const POST_TAG_TAXONOMY = [ 'category', 'post_tag' ]
const db = new Database(config['mysql'])

function term_tag_convert(term) {
  return {
    name: term.name,
    slug: term.slug,
  }
}

let typeNames = { post: {}, page: {} }
function generateName(d, type) {
  d = new Date(d)
  const date = `${d.getFullYear()}-${ii(d.getMonth() + 1)}-${ii(d.getDate())}`
  let n = typeNames[type][date]
  if (n) {
    n++
  } else {
    n = 1
  }
  typeNames[type][date] = n
  return date + '.' + ii(n)
}

async function main() {
  await db.connect()
  const terms = await db.query('SELECT * FROM ??;', [ PREFIX + 'terms' ])
  let count = terms.length
  console.log('exporting tags...\ntags count: %d', count)
  const tags = terms.map(term_tag_convert)

  try {
    fs.mkdirSync(SOURCE_DIR)
  } catch (e) {}
  fs.writeFileSync(path.join(SOURCE_DIR, 'tags.json'), JSON.stringify(tags, null, 2))

  let r = await db.queryOne('SELECT COUNT(*) as count FROM ?? WHERE post_type = ?;',
    [ PREFIX + 'posts', 'post' ])
  count = parseInt(r.count)
  console.log('exporting posts...\npost count: %d', count)
  const posts = []
  try {
    fs.mkdirSync(path.join(SOURCE_DIR, 'posts'))
  } catch (e) {}
  for (let i = 0; i < count; i += 20) {
    const _posts = await db.query('SELECT * FROM ?? WHERE post_type = ? ORDER BY post_date LIMIT ' + i + ', 20;',
      [ PREFIX + 'posts', 'post' ])
    // const revisions = await db.query('SELECT * FROM ?? WHERE post_parent = ? AND post_type = ? ORDER BY post_date;',
    //   [ PREFIX + 'posts', post.ID, 'revision' ])
    // revisions.forEach(rev => {
    //   console.log('  ->', rev.post_date, rev.post_modified, rev.post_content)
    // })
    for (let j = 0; j < _posts.length; j++) {
      const post = _posts[j]
      const post_taxonomy_map = await db.query('SELECT * FROM ?? t1'
          + ' LEFT JOIN ?? t2'
          + ' ON t1.term_taxonomy_id = t2.term_taxonomy_id'
          + ' WHERE t2.object_id = ?;',
        [ PREFIX + 'term_taxonomy', PREFIX + 'term_relationships', post.ID ])

      const tag_ids = post_taxonomy_map.filter(m => POST_TAG_TAXONOMY.includes(m.taxonomy))
                                       .map(m => m.term_id)

      const tags = terms.filter(t => tag_ids.includes(t.term_id))
                        .map(term_tag_convert)
      const p = {
        slug: post.post_name,
        title: post.post_title,
        create_time: post.post_date,
        update_time: post.post_modified,
        html: true,
        content: post.post_content,
        tags,
      }
      fs.writeFileSync(path.join(SOURCE_DIR, `posts/${generateName(p.create_time, 'post')}.json`), JSON.stringify(p, null, 2))
    }
  }

  r = await db.queryOne('SELECT COUNT(*) as count FROM ?? WHERE post_type = ?;',
    [ PREFIX + 'posts', 'page' ])
  count = parseInt(r.count)
  console.log('exporting pages...\npage count: %d', count)
  const pages = []
  try {
    fs.mkdirSync(path.join(SOURCE_DIR, 'pages'))
  } catch (e) {}
  for (let i = 0; i < count; i += 20) {
    const _pages = await db.query('SELECT * FROM ?? WHERE post_type = ? ORDER BY post_date LIMIT ' + i + ', 20;',
      [ PREFIX + 'posts', 'page' ])
    _pages.forEach(page => {
      const p = {
        slug: page.post_name,
        title: page.post_title,
        create_time: page.post_date,
        update_time: page.post_modified,
        html: true,
        content: page.post_content,
      }
      fs.writeFileSync(path.join(SOURCE_DIR, `pages/${generateName(p.create_time, 'page')}.json`), JSON.stringify(p, null, 2))
    })
  }

  r = await db.queryOne('SELECT COUNT(*) as count FROM ??;', [ PREFIX + 'links' ])
  count = parseInt(r.count)
  console.log('exporting links...\nlink count: %d', count)
  const _links = await db.query('SELECT * FROM ??;', [ PREFIX + 'links' ])
  const links = []
  _links.forEach(link => {
    links.push({
      url: link.link_url,
      name: link.link_name,
      description: link.link_description,
      rel: link.link_rel,
    })
  })
  fs.writeFileSync(path.join(SOURCE_DIR, 'links.json'), JSON.stringify(links, null, 2))

  db.close()
}

main().catch(err => {
  console.log(err)
  db.close()
})
