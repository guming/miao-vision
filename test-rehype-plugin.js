/**
 * Standalone test for rehype-block-placeholder plugin
 * Run with: node test-rehype-plugin.js
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

// Simple inline version of the plugin for testing
function rehypeBlockPlaceholder(options) {
  const blockIds = options.blockIds || new Map()
  let codeBlockCounter = 0

  return function transformer(tree) {
    console.log('Plugin transformer called')
    console.log('Tree type:', tree.type)

    function visit(node, parent, index) {
      if (node.type === 'element' && node.tagName === 'pre' && node.children && node.children.length > 0) {
        const codeNode = node.children[0]
        if (codeNode.type === 'element' && codeNode.tagName === 'code') {
          const className = codeNode.properties?.className
          let language = 'text'

          if (Array.isArray(className)) {
            const langClass = className.find(c => c.startsWith('language-'))
            if (langClass) {
              language = langClass.replace('language-', '')
            }
          }

          const blockId = `block_${codeBlockCounter++}`
          blockIds.set(blockId, { id: blockId, language })

          console.log(`Found ${language} code block: ${blockId}`)

          if (language === 'sql' || language === 'chart') {
            console.log(`  Replacing with placeholder...`)
            const placeholder = {
              type: 'element',
              tagName: 'div',
              properties: {
                className: ['block-placeholder', `block-placeholder-${language}`],
                'data-block-id': blockId,
                'data-block-type': language
              },
              children: [
                { type: 'text', value: `<!-- ${language} block placeholder: ${blockId} -->` }
              ]
            }

            if (parent && typeof index === 'number') {
              parent.children[index] = placeholder
              console.log(`  ✅ Replaced!`)
            }
          }
        }
      }

      if (node.children) {
        node.children.forEach((child, i) => visit(child, node, i))
      }
    }

    if (tree.children) {
      tree.children.forEach((child, i) => visit(child, tree, i))
    }

    return tree
  }
}

// Test markdown
const testMarkdown = `# Test Report

## SQL Block

\`\`\`sql test_query
SELECT 'Hello' as message, 123 as value
\`\`\`

## Chart Block

\`\`\`chart
type: bar
data: test_query
x: message
y: value
\`\`\`

End of report.
`

async function test() {
  console.log('Testing rehype-block-placeholder plugin...\n')

  const blockIds = new Map()

  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeBlockPlaceholder, { blockIds })
    .use(rehypeStringify)

  const result = await processor.process(testMarkdown)
  const html = String(result)

  console.log('\n=== Results ===')
  console.log('BlockIds Map:', Array.from(blockIds.entries()))
  console.log('\nHTML output length:', html.length)
  console.log('\nContains "block-placeholder"?', html.includes('block-placeholder'))
  console.log('\nHTML output:')
  console.log(html)

  if (html.includes('block-placeholder')) {
    console.log('\n✅ SUCCESS: Placeholders found in HTML')
  } else {
    console.log('\n❌ FAIL: No placeholders in HTML')
  }
}

test().catch(console.error)
