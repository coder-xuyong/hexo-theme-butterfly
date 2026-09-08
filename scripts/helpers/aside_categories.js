'use strict'

hexo.extend.helper.register('aside_categories', function (categories, options = {}) {
  if (!categories || !Object.prototype.hasOwnProperty.call(categories, 'length')) {
    options = categories || {}
    categories = this.site.categories
  }

  if (!categories || !categories.length) return ''

  const { config } = this
  const showCount = Object.prototype.hasOwnProperty.call(options, 'show_count') ? options.show_count : true
  const depth = options.depth ? parseInt(options.depth, 10) : 0
  const orderby = options.orderby || 'name'
  const order = options.order || 1
  const categoryDir = this.url_for(config.category_dir)
  const limit = options.limit === 0 ? categories.length : (options.limit || categories.length)
  const isExpand = options.expand !== 'none'
  const expandClass = isExpand && options.expand === true ? 'expand' : ''
  const buttonLabel = this._p('aside.more_button')

  // [新增] 是否显示分类下的文章列表及文章数量限制
  const showPosts = Object.prototype.hasOwnProperty.call(options, 'show_posts') ? options.show_posts : true
  const postLimit = options.post_limit || 30

  const categoryMap = new Map()
  categories.forEach(cat => {
    if (cat.length) {
      const parentId = cat.parent || 'root'
      if (!categoryMap.has(parentId)) {
        categoryMap.set(parentId, [])
      }
      categoryMap.get(parentId).push(cat)
    }
  })

  const sortFn = (a, b) => {
    const valA = a[orderby]
    const valB = b[orderby]
    if (valA < valB) return -order
    if (valA > valB) return order
    return 0
  }

  for (const list of categoryMap.values()) {
    list.sort(sortFn)
  }

  // [新增] 生成分类下文章列表的 HTML
  const generatePostList = (posts) => {
    let result = ''
    const allPosts = posts.toArray()
    allPosts.sort((a, b) => {
      const orderA = a.order || Number.MAX_SAFE_INTEGER
      const orderB = b.order || Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })
    const limitedPosts = allPosts.slice(0, postLimit)
    limitedPosts.forEach(post => {
      result += `<li class="card-article-list-item">
                  <a class="card-article-list-link" href="${this.url_for(post.path)}">
                    <span class="card-article-list-name">${post.title}</span>
                  </a>
                </li>`
    })
    if (allPosts.length > postLimit) {
      const firstPost = allPosts[0]
      const catPath = firstPost.path.split('/')[1] || ''
      result += `<li class="card-article-list-item">
                  <a class="card-article-list-link" href="${this.url_for(catPath)}/">
                    <span class="card-article-list-name">${this._p('aside.more_article')} (${allPosts.length - postLimit})</span>
                  </a>
                </li>`
    }
    return result
  }

  const hierarchicalList = (remaining, level = 0, parentId = 'root') => {
    let result = ''
    if (remaining > 0 && categoryMap.has(parentId)) {
      categoryMap.get(parentId).forEach(cat => {
        if (remaining > 0) {
          remaining -= 1
          let child = ''
          if (!depth || level + 1 < depth) {
            const childList = hierarchicalList(remaining, level + 1, cat._id)
            child = childList.result
            remaining = childList.remaining
          }

          // [新增] 判断是否为叶子分类（无子分类且满足深度限制），用于决定是否显示文章列表
          const hasChild = categoryMap.has(cat._id) && categoryMap.get(cat._id).length > 0
          const isLeaf = !hasChild && (!depth || level >= depth - 1)

          let postHtml = ''
          if (showPosts && isLeaf && cat.posts && cat.posts.length > 0) {
            postHtml = `<ul class="card-article-list child">${generatePostList(cat.posts)}</ul>`
          }

          // [修改] 展开内容的判断由 child 扩展为 child || postHtml，且不再限制只对顶级生效
          const hasExpandContent = child || postHtml
          const parentClass = isExpand && hasExpandContent ? 'parent' : ''

          result += `<li class="card-category-list-item ${parentClass}">`
          result += `<a class="card-category-list-link" href="${this.url_for(cat.path)}">`
          result += `<span class="card-category-list-name">${cat.name}</span>`

          if (showCount) {
            result += `<span class="card-category-list-count">${cat.length}</span>`
          }

          // [修改] 展开图标条件改为 hasExpandContent，不再限定顶级
          if (isExpand && hasExpandContent) {
            result += `<i class="fas fa-caret-left ${expandClass}"></i>`
          }

          result += '</a>'

          if (child) {
            result += `<ul class="card-category-list child">${child}</ul>`
          }
          // [新增] 追加文章列表
          if (postHtml) {
            result += postHtml
          }

          result += '</li>'
        }
      })
    }
    return { result, remaining }
  }

  const list = hierarchicalList(limit)

  const moreButton = categories.length > limit
    ? `<a class="card-more-btn" href="${categoryDir}/" title="${buttonLabel}">
      <i class="fas fa-angle-right"></i></a>`
    : ''

  return `<div class="item-headline"><i class="fas fa-folder-open"></i><span>${this._p('aside.card_categories')}</span>${moreButton}</div>
          <ul class="card-category-list${isExpand && list.result ? ' expandBtn' : ''}" id="aside-cat-list">
            ${list.result}
          </ul>`
})